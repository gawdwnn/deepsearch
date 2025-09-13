import type { StreamTextResult, UIMessage, UIMessageStreamWriter } from "ai";

import { logger } from "~/utils/logger";
import { searchSerper } from "~/lib/serper";
import { scrapePages } from "~/lib/scraper";
import { env } from "~/lib/env";
import { SystemContext } from "./system-context";
import { getNextAction, type Action } from "./get-next-action";
import { answerQuestion } from "./answer-question";
import type { ActionStep, DeepSearchUIMessage } from "~/types/messages";
import { createActionStep, updateActionStep } from "~/types/messages";
import type { UserLocation } from "./location-context";

export const runAgentLoop = async (
  messages: UIMessage[],
  writer: UIMessageStreamWriter<DeepSearchUIMessage>,
  opts: {
    langfuseTraceId?: string;
    userLocation?: UserLocation;
  } = {},
): Promise<StreamTextResult<Record<string, never>, string>> => {
  // A persistent container for the state of our system
  const context = new SystemContext(messages, opts.userLocation);
  const { langfuseTraceId } = opts;
  
  // Track action steps for data parts writing
  const actionSteps: ActionStep[] = [];

  // Helper function to stream action steps collection
  const streamActionSteps = () => {
    writer.write({
      type: 'data-action-steps',
      data: {
        steps: actionSteps,
        currentStep: actionSteps[actionSteps.length - 1]?.id
      }
    });
  };

  // Helper function to update step phase and stream immediately
  const updateStepPhase = (stepId: string, phase: ActionStep['phase'], metadata?: ActionStep['metadata']) => {
    const currentStep = actionSteps.find(s => s.id === stepId);
    if (currentStep) {
      const updatedStep = updateActionStep(currentStep, { 
        phase,
        metadata: metadata ? { ...currentStep.metadata, ...metadata } : currentStep.metadata
      });
      const stepIndex = actionSteps.findIndex(s => s.id === stepId);
      actionSteps[stepIndex] = updatedStep;
      
      // Stream updated action steps collection
      streamActionSteps();
    }
  };

  // A loop that continues until we have an answer or we've taken 10 actions
  while (!context.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction: Action = await getNextAction(context, langfuseTraceId);

    // Create action step for this action
    const stepId = `step-${context.getStepCount() + 1}`; // +1 because we haven't incremented yet
    const actionStep = createActionStep(
      stepId,
      nextAction.type,
      nextAction.title,
      nextAction.reasoning
    );
    
    // Add metadata based on action type
    if (nextAction.type === "search" && nextAction.query) {
      actionStep.metadata = { query: nextAction.query };
    } else if (nextAction.type === "scrape" && nextAction.urls) {
      actionStep.metadata = { urls: nextAction.urls };
    }

    // Add step and stream collection immediately
    actionSteps.push(actionStep);
    streamActionSteps();

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      if (!nextAction.query) {
        logger.error("Search action missing query", { action: nextAction });
        
        // Update step as failed
        updateStepPhase(stepId, 'failed', { error: 'Missing search query' });
        
        context.incrementStep();
        continue;
      }

      try {
        // Update step to in_progress before starting search
        updateStepPhase(stepId, 'in_progress');
        
        
        const results = await searchSerper(
          { q: nextAction.query, num: env.SEARCH_RESULTS_COUNT },
          undefined,
        );

        const searchResults = (results.organic ?? []).map((result) => ({
          date: result.date ?? "",
          title: result.title,
          url: result.link,
          snippet: result.snippet,
        }));

        context.reportQueries([{
          query: nextAction.query,
          results: searchResults,
        }]);

        // Update step as completed with result count
        updateStepPhase(stepId, 'completed', { 
          query: nextAction.query,
          resultCount: searchResults.length 
        });

      } catch (searchError) {
        logger.error("Search tool error", {
          error: searchError instanceof Error ? searchError.message : String(searchError),
          query: nextAction.query,
          searchProvider: "serper",
        });

        // Update step as failed with error
        updateStepPhase(stepId, 'failed', { 
          query: nextAction.query,
          error: searchError instanceof Error ? searchError.message : String(searchError)
        });
      }

    } else if (nextAction.type === "scrape") {
      if (!nextAction.urls || nextAction.urls.length === 0) {
        logger.error("Scrape action missing URLs", { action: nextAction });
        context.incrementStep();
        continue;
      }

      try {
        // Update step to in_progress before starting scrape
        updateStepPhase(stepId, 'in_progress');
        
        
        const scrapeResults = await scrapePages(nextAction.urls);
        
        if (scrapeResults.success) {
          context.reportScrapes(
            scrapeResults.results.map(result => ({
              url: result.url,
              result: result.data,
            }))
          );

          // Update step as completed with result count
          updateStepPhase(stepId, 'completed', { 
            urls: nextAction.urls,
            resultCount: scrapeResults.results.length 
          });
        } else {
          logger.error("Scraping failed", { 
            urls: nextAction.urls, 
            error: scrapeResults.error 
          });

          // Update step as failed with error
          updateStepPhase(stepId, 'failed', { 
            urls: nextAction.urls,
            error: scrapeResults.error 
          });
        }

      } catch (scrapeError) {
        logger.error("Scrape tool error", {
          error: scrapeError instanceof Error ? scrapeError.message : String(scrapeError),
          urls: nextAction.urls,
          scrapeProvider: "firecrawl",
        });

        // Update step as failed with error
        updateStepPhase(stepId, 'failed', { 
          urls: nextAction.urls,
          error: scrapeError instanceof Error ? scrapeError.message : String(scrapeError)
        });
      }

    } else if (nextAction.type === "answer") {
      // Update step as completed for answer action
      updateStepPhase(stepId, 'completed');
      
      return answerQuestion(context, { langfuseTraceId });
    }

    // We increment the step counter
    context.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(context, { isFinal: true, langfuseTraceId });
};