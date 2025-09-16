import { generateObject } from "ai";
import { z } from "zod";

import { model } from "~/types/models";
import type { SystemContext } from "./system-context";

export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = ContinueAction | AnswerAction;

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Need more information', 'Ready to answer question'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  type: z.enum(["continue", "answer"]).describe(
    `The type of action to take.
      - 'continue': More information is needed to answer the question completely.
      - 'answer': Sufficient information has been gathered to provide a comprehensive answer.`,
  ),
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
    system: `You are a decision-making component of an AI research assistant. Your only job is to determine whether we have enough information to answer the user's question or if we need to continue gathering more information.

When providing the title and reasoning:
- Title should be extremely concise (e.g., "Need more information", "Ready to answer")
- Reasoning should explain why you believe we can answer now or what gaps still exist`,
    prompt: `## Conversation History: ${context.getMessageHistory()}
${context.getLocationContext()}

## Current Information Available
${context.getSearchHistory()}

## Decision Task

Based on the conversation history and the information we've gathered so far, determine:

- **continue**: We don't have enough information to provide a comprehensive answer yet
- **answer**: We have sufficient information to provide a complete and accurate response

Consider:
- Do we have enough factual information to answer all aspects of the user's question?
- Are there significant gaps or contradictions in our current knowledge?
- Would additional searches likely provide crucial missing information?
- Is the information current enough for questions about recent events?`,
  });

  return result.object as Action;
};
