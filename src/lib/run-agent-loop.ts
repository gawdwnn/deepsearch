import type { StreamTextResult, UIMessage, UIMessageStreamWriter } from "ai";

import { createActionStep, manageActionStep } from "~/lib/action-step-helpers";
import { env } from "~/lib/env";
import { searchTavily } from "~/lib/tavily";
import type { ActionStep, DeepSearchUIMessage } from "~/types/messages";
import { logger } from "~/utils/logger";
import { answerQuestion } from "./answer-question";
import { getNextAction, type Action } from "./get-next-action";
import type { UserLocation } from "./location-context";
import { queryRewriter, type QueryPlan } from "./query-rewriter";
import { SystemContext } from "./system-context";

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

    // Step 2: Execute search and scrape with Tavily
    const searchStepId = `search-${context.getStepCount() + 1}`;
    const searchStep = createActionStep(
      searchStepId,
      "search",
      "Searching and scraping web content",
      `Running ${queryPlan.queries.length} searches with content extraction in parallel`,
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
        const results = await searchTavily(
          { query, num: env.SEARCH_RESULTS_COUNT },
          undefined,
        );

        return {
          query,
          results,
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
        (sum, r) => sum + r.results.length,
        0,
      );

      manageActionStep(actionSteps, streamActionStep, "update", {
        id: searchStepId,
        phase: "completed",
        metadata: {
          queries: queryPlan.queries,
          resultCount: totalResults,
        },
      });
    } catch (searchError) {
      logger.error("Tavily search and scrape execution failed", {
        error:
          searchError instanceof Error
            ? searchError.message
            : String(searchError),
        queries: queryPlan.queries,
        queryCount: queryPlan.queries.length,
        resultLimit: env.SEARCH_RESULTS_COUNT,
        stepId: searchStepId,
        stack: searchError instanceof Error ? searchError.stack : undefined,
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
