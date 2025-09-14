import { generateObject } from "ai";
import { z } from "zod";

import { model } from "~/types/models";
import type { SystemContext } from "./system-context";

export interface SearchAction {
  type: "search";
  title: string;
  reasoning: string;
  query: string;
}


export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action =
  | SearchAction
  | AnswerAction;

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
  type: z
    .enum(["search", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for information and automatically scrape found URLs.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Only Required if type is 'search'.",
    )
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    ...(langfuseTraceId && {
      experimental_telemetry: {
        isEnabled: true,
        functionId: "get-next-action",
        metadata: {
          langfuseTraceId,
        },
      },
    }),
    system: `You are a helpful AI assistant with web search capabilities that automatically scrapes found URLs.

When providing the title and reasoning for each action:
- Title should be extremely concise and descriptive (e.g., "Searching recent injury reports", "Answering user question")
- Reasoning should explain why this specific action is needed at this point in the workflow
- Be specific about what information you're looking for or why you're ready to answer`,
prompt: `## Conversation History: ${context.getMessageHistory()}
${context.getLocationContext()}
## Core Workflow

1. Search the web for relevant information (automatically scrapes all found URLs)
2. Synthesize information from multiple sources
3. Provide comprehensive answers with proper citations

## Search Guidelines

- For current/latest/recent queries: Use both specific dates and relative terms
  - Include "today", "this week", "latest", "recent" as appropriate
  - Can also use the current date when specificity helps
- Note publication dates and prioritize recent information
- Search for multiple diverse sources when possible
- Each search automatically retrieves full content from found URLs

## Action Selection

Choose the most appropriate next action based on the context and user's question:

- **search**: When you need more information about a topic (automatically includes full content from found pages)
- **answer**: When you have sufficient information to provide a complete response

## Context

${context.getSearchHistory()}`,
  });

  return result.object as Action;
};