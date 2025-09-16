import type { StreamTextResult, UIMessage, UIMessageStreamWriter } from "ai";

import { logger } from "~/utils/logger";
import { searchSerper } from "~/lib/serper";
import { scrapePages } from "~/lib/scraper";
import { summarizeURL } from "~/lib/summarize-url";
import { env } from "~/lib/env";
import { SystemContext } from "./system-context";
import { getNextAction, type Action } from "./get-next-action";
import { queryRewriter, type QueryPlan } from "./query-rewriter";
import { answerQuestion } from "./answer-question";
import type { ActionStep, DeepSearchUIMessage } from "~/types/messages";
import { createActionStep, manageActionStep } from "~/lib/action-step-helpers";
import type { UserLocation } from "./location-context";

export const runAgentLoop = async (
  messages: UIMessage[],
  writer: UIMessageStreamWriter<DeepSearchUIMessage>,
  opts: {
    langfuseTraceId?: string;
    userLocation?: UserLocation;
  } = {},
): Promise<{
  result: StreamTextResult<Record<string, never>, string>;
  finalActionSteps: ActionStep[];
}> => {
  const context = new SystemContext(messages, opts.userLocation);
  const { langfuseTraceId } = opts;
  const actionSteps: ActionStep[] = [];

  const streamActionStep = (step: ActionStep) => {
    writer.write({
      type: "data-action-step",
      data: step,
      transient: true,
    });
  };

  while (!context.shouldStop()) {
    // Step 1: Plan research approach
    const planStepId = `plan-${context.getStepCount() + 1}`;
    const planStep = createActionStep(
      planStepId,
      "plan",
      "Planning research approach",
      "Analyzing question and creating search strategy",
    );

    manageActionStep(actionSteps, streamActionStep, "create", planStep);
    manageActionStep(actionSteps, streamActionStep, "update", {
      id: planStepId,
      phase: "in_progress",
    });

    let queryPlan: QueryPlan;
    try {
      queryPlan = await queryRewriter(context, langfuseTraceId);

      manageActionStep(actionSteps, streamActionStep, "update", {
        id: planStepId,
        phase: "completed",
        metadata: {
          plan: queryPlan.plan,
          queries: queryPlan.queries,
        },
      });
    } catch (planError) {
      logger.error("Query planning failed", {
        error:
          planError instanceof Error ? planError.message : String(planError),
      });

      manageActionStep(actionSteps, streamActionStep, "update", {
        id: planStepId,
        phase: "failed",
        metadata: {
          error:
            planError instanceof Error ? planError.message : String(planError),
        },
      });

      context.incrementStep();
      continue;
    }

    // Step 2: Execute search queries
    const searchStepId = `search-${context.getStepCount() + 1}`;
    const searchStep = createActionStep(
      searchStepId,
      "search",
      "Executing search queries",
      `Running ${queryPlan.queries.length} searches in parallel`,
    );

    manageActionStep(actionSteps, streamActionStep, "create", searchStep);
    manageActionStep(actionSteps, streamActionStep, "update", {
      id: searchStepId,
      phase: "in_progress",
      metadata: {
        queries: queryPlan.queries,
      },
    });

    try {
      const searchPromises = queryPlan.queries.map(async (query) => {
        const results = await searchSerper(
          { q: query, num: env.SEARCH_RESULTS_COUNT },
          undefined,
        );

        const searchResults = (results.organic ?? []).map((result) => ({
          date: result.date ?? "",
          title: result.title,
          url: result.link,
          snippet: result.snippet,
        }));

        const searchUrls = searchResults.map((result) => result.url);
        const scrapeResults = await scrapePages(searchUrls);

        const summarizationPromises = searchResults.map((searchResult) => {
          const scrapeResult = scrapeResults.results.find(
            (sr) => sr.url === searchResult.url,
          );

          if (!scrapeResult?.success) {
            return Promise.resolve({
              success: false,
              url: searchResult.url,
              error: "No content to summarize",
              summary: "",
            });
          }

          return summarizeURL({
            conversationHistory: context.getMessageHistory(),
            scrapedContent: scrapeResult.data,
            searchMetadata: {
              title: searchResult.title,
              url: searchResult.url,
              date: searchResult.date,
              snippet: searchResult.snippet,
            },
            query,
            langfuseTraceId,
          });
        });

        const summarizationResults = await Promise.all(summarizationPromises);

        const finalResults = [];
        for (let i = 0; i < searchResults.length; i++) {
          const searchResult = searchResults[i];
          const summaryResult = summarizationResults[i];

          if (summaryResult?.success && searchResult) {
            finalResults.push({
              date: searchResult.date,
              title: searchResult.title,
              url: searchResult.url,
              snippet: searchResult.snippet,
              summary: summaryResult.summary,
            });
          }
        }

        return {
          query,
          results: finalResults,
          searchResults,
          scrapeResults,
        };
      });

      const allSearchResults = await Promise.all(searchPromises);

      for (const searchResult of allSearchResults) {
        context.reportSearch({
          query: searchResult.query,
          results: searchResult.results,
        });
      }

      const totalResults = allSearchResults.reduce(
        (sum, r) => sum + r.searchResults.length,
        0,
      );
      const totalScraped = allSearchResults.reduce(
        (sum, r) =>
          sum + r.scrapeResults.results.filter((sr) => sr.success).length,
        0,
      );
      const totalSummarized = allSearchResults.reduce(
        (sum, r) => sum + r.results.length,
        0,
      );

      manageActionStep(actionSteps, streamActionStep, "update", {
        id: searchStepId,
        phase: "completed",
        metadata: {
          queries: queryPlan.queries,
          resultCount: totalResults,
          scrapedCount: totalScraped,
          summarizedCount: totalSummarized,
        },
      });
    } catch (searchError) {
      logger.error("Parallel search execution failed", {
        error:
          searchError instanceof Error
            ? searchError.message
            : String(searchError),
        queries: queryPlan.queries,
      });

      manageActionStep(actionSteps, streamActionStep, "update", {
        id: searchStepId,
        phase: "failed",
        metadata: {
          queries: queryPlan.queries,
          error:
            searchError instanceof Error
              ? searchError.message
              : String(searchError),
        },
      });
    }

    // Step 3: Decide whether to continue or answer
    const nextAction: Action = await getNextAction(context, langfuseTraceId);

    const decisionStepId = `decision-${context.getStepCount() + 1}`;
    const decisionStep = createActionStep(
      decisionStepId,
      nextAction.type,
      nextAction.title,
      nextAction.reasoning,
    );

    manageActionStep(actionSteps, streamActionStep, "create", decisionStep);

    if (nextAction.type === "answer") {
      manageActionStep(actionSteps, streamActionStep, "update", {
        id: decisionStepId,
        phase: "completed",
      });
      const result = answerQuestion(context, { langfuseTraceId });
      return {
        result,
        finalActionSteps: actionSteps,
      };
    } else {
      manageActionStep(actionSteps, streamActionStep, "update", {
        id: decisionStepId,
        phase: "completed",
      });
    }

    context.incrementStep();
  }

  const result = answerQuestion(context, { isFinal: true, langfuseTraceId });
  return {
    result,
    finalActionSteps: actionSteps,
  };
};
