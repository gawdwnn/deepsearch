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

export interface ScrapeAction {
  type: "scrape";
  title: string;
  reasoning: string;
  urls: string[];
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action =
  | SearchAction
  | ScrapeAction
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
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape one or more URLs.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Only Required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape. Only Required if type is 'scrape'.",
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
    system: `You are a helpful AI assistant with web search and scraping capabilities.

When providing the title and reasoning for each action:
- Title should be extremely concise and descriptive (e.g., "Searching recent injury reports", "Scraping NHS guidance page", "Answering user question")
- Reasoning should explain why this specific action is needed at this point in the workflow
- Be specific about what information you're looking for or why you're ready to answer`,
    prompt: `## Conversation History: ${context.getMessageHistory()}

## Core Workflow

1. Search the web for relevant URLs using search
2. Select and scrape the most relevant pages using scrape
3. Synthesize information from multiple sources
4. Provide comprehensive answers with proper citations

## Search Guidelines

- For current/latest/recent queries: Use both specific dates and relative terms
  - Include "today", "this week", "latest", "recent" as appropriate
  - Can also use the current date when specificity helps
- Note publication dates and prioritize recent information
- Search for multiple diverse sources when possible

## When to Scrape Pages

- User needs detailed information beyond search snippets
- Full article analysis or summarization required
- Search results lack sufficient context

## Action Selection

Choose the most appropriate next action based on the context and user's question:

- **search**: When you need more information about a topic
- **scrape**: When you have URLs but need their full content
- **answer**: When you have sufficient information to provide a complete response

## Context

${context.getQueryHistory()}

${context.getScrapeHistory()}`,
  });

  return result.object as Action;
};