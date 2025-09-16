import { generateObject } from "ai";
import { z } from "zod";

import { model } from "~/types/models";
import type { SystemContext } from "./system-context";

export interface QueryPlan {
  plan: string;
  queries: string[];
}

export const queryPlanSchema = z.object({
  plan: z
    .string()
    .describe(
      "A detailed research plan explaining the logical progression of information needed to answer the question. Explain what foundational knowledge is required, dependencies between information pieces, and the strategic approach."
    ),
  queries: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe(
      "A numbered list of 1-3 sequential search queries that are specific, focused, written in natural language, and build upon each other logically. Start with broader context before narrowing to specifics."
    ),
});

export const queryRewriter = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<QueryPlan> => {
  const result = await generateObject({
    model,
    schema: queryPlanSchema,
    ...(langfuseTraceId && {
      experimental_telemetry: {
        isEnabled: true,
        functionId: "query-rewriter",
        metadata: {
          langfuseTraceId,
        },
      },
    }),
    system: `You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

First, analyze the question thoroughly:
- Break down the core components and key concepts
- Identify any implicit assumptions or context needed
- Consider what foundational knowledge might be required
- Think about potential information gaps that need filling

Then, develop a strategic research plan that:
- Outlines the logical progression of information needed
- Identifies dependencies between different pieces of information
- Considers multiple angles or perspectives that might be relevant
- Anticipates potential dead-ends or areas needing clarification

Finally, translate this plan into a numbered list of 3-5 sequential search queries that:
- Are specific and focused (avoid broad queries that return general information)
- Are written in natural language without Boolean operators (no AND/OR)
- Progress logically from foundational to specific information
- Build upon each other in a meaningful way

Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.`,
    prompt: `## Conversation History: ${context.getMessageHistory()}
${context.getLocationContext()}

## Current Search History
${context.getSearchHistory()}

## Your Task

Create a comprehensive research plan and generate 3-5 search queries to gather the information needed to answer the user's question.

Consider:
- What information do we already have from previous searches?
- What gaps exist in our current knowledge?
- What foundational context might be missing?
- How should we sequence our searches for maximum effectiveness?

For current/latest/recent queries, use both specific dates and relative terms like "today", "this week", "latest", "recent" as appropriate.

The queries will be executed in parallel, so ensure each serves a distinct purpose in gathering different aspects of the needed information.`,
  });

  return result.object as QueryPlan;
};