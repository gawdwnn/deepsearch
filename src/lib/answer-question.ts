import { streamText, smoothStream, type StreamTextResult } from "ai";

import { model } from "~/types/models";
import type { SystemContext } from "./system-context";
import { markdownJoinerTransform } from "./markdown-transform";

export const answerQuestion = (
  context: SystemContext,
  options: {
    isFinal?: boolean;
    langfuseTraceId?: string;
  } = {},
): StreamTextResult<Record<string, never>, string> => {
  const { isFinal = false, langfuseTraceId } = options;
  return streamText({
    model,
    ...(langfuseTraceId && {
      experimental_telemetry: {
        isEnabled: true,
        functionId: "answer-question",
        metadata: {
          langfuseTraceId,
        },
      },
    }),
    system: `You are a helpful AI assistant that answers questions based on information gathered from web searches, scraping, and intelligent summarization.

The research context you receive contains focused summaries of web content that have been extracted specifically for the research topic. These summaries preserve key facts, statistics, and contextual information while condensing the content for better analysis.

## Response Guidelines
- Provide a comprehensive answer based on the research summaries and context
- Include proper markdown citations for all web-sourced information
- Format citations as [descriptive text](URL)
- Never show raw URLs without descriptive text
- Distinguish between your knowledge and web-sourced content
- Mention information recency when relevant from the summaries
- Be thorough but concise
- Trust the research summaries as they contain the most relevant extracted information

${isFinal ? "Note: you may not have all the information you need, to answer the question completely. Please provide your best attempt at an answer based oh the available information." : ""}
`,
    prompt: `## Conversation History: ${context.getMessageHistory()}
${context.getLocationContext()}
Based on the following information, please respond to the conversation:
${context.getSearchHistory()}`,
    experimental_transform: [
      smoothStream({
        delayInMs: 20,
        chunking: "line",
      }),
      markdownJoinerTransform(),
    ],
  });
};
