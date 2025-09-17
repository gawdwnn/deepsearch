import type { UIMessage } from "ai";
import {
  createUIMessageStream,
  JsonToSseTransformStream,
  UI_MESSAGE_STREAM_HEADERS,
} from "ai";

import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { updateChatActiveStreamId, upsertChat } from "~/lib/db/mutations";
import type { ActionStep, DeepSearchUIMessage } from "~/types/messages";
import { logger } from "~/utils/logger";
import type { UserLocation } from "./location-context";
import { runAgentLoop } from "./run-agent-loop";

interface LangfuseSpan {
  end: (data: {
    output: {
      success: boolean;
      chatId: string;
      messagesStored: number;
    };
  }) => void;
}

interface LangfuseTrace {
  update: (data: { sessionId: string }) => void;
  span: (options: {
    name: string;
    input: {
      userId: string;
      chatId: string;
      title: string;
      messageCount: number;
    };
  }) => LangfuseSpan;
}

interface LangfuseClient {
  flushAsync: () => Promise<void>;
}

interface PersistenceContext {
  chatId: string;
  userId: string;
  trace: LangfuseTrace;
  langfuse: LangfuseClient;
}

export const streamFromDeepSearch = async (
  opts: {
    messages: UIMessage[];
    langfuseTraceId: string;
    userLocation?: UserLocation;
  } & PersistenceContext,
) => {
  // Store final action steps for persistence
  let finalActionSteps: ActionStep[] = [];

  // Create UI message stream with AI SDK v5 Data Parts
  const stream = createUIMessageStream<DeepSearchUIMessage>({
    execute: async ({ writer }) => {
      // Create assistant message before action steps stream
      writer.write({
        type: "text-start",
        id: "assistant-response",
      });

      const { result, finalActionSteps: steps } = await runAgentLoop(
        opts.messages,
        writer,
        {
          langfuseTraceId: opts.langfuseTraceId,
          userLocation: opts.userLocation,
        },
      );

      finalActionSteps = steps;

      writer.merge(
        result.toUIMessageStream({
          sendStart: false,
        }),
      );
    },
    originalMessages: opts.messages as DeepSearchUIMessage[],
    onFinish: async ({ messages: allMessages }) => {
      try {
        // Update trace sessionId
        opts.trace.update({
          sessionId: opts.chatId,
        });

        // Generate title from first user message
        const firstUserMessage = allMessages.find(
          (msg: UIMessage) => msg.role === "user",
        );
        let title = "";

        if (firstUserMessage?.parts) {
          const textPart = firstUserMessage.parts.find(
            (part) => part.type === "text",
          );
          if (
            textPart &&
            "text" in textPart &&
            typeof textPart.text === "string"
          ) {
            title = textPart.text.slice(0, 100);
          }
        }

        // Track database operation
        const upsertChatSpan = opts.trace.span({
          name: "upsert-chat",
          input: {
            userId: opts.userId,
            chatId: opts.chatId,
            title,
            messageCount: allMessages.length,
          },
        });

        // Add final action steps to the last assistant message for persistence
        if (finalActionSteps.length > 0) {
          const lastAssistantMessage = allMessages.findLast(
            (msg) => msg.role === "assistant",
          );
          if (lastAssistantMessage?.parts) {
            // Add persistent action steps data part
            lastAssistantMessage.parts.push({
              type: "data-action-steps",
              data: {
                steps: finalActionSteps,
                currentStep: finalActionSteps[finalActionSteps.length - 1]?.id,
              },
            });
          }
        }

        await upsertChat({
          userId: opts.userId,
          chatId: opts.chatId,
          title,
          messages: allMessages,
        });

        upsertChatSpan.end({
          output: {
            success: true,
            chatId: opts.chatId,
            messagesStored: allMessages.length,
          },
        });

        await opts.langfuse.flushAsync();

        // Clear active stream on finish
        await updateChatActiveStreamId({ chatId: opts.chatId, streamId: null });
      } catch (error) {
        logger.error("Failed to save chat messages", {
          error: error instanceof Error ? error.message : String(error),
          chatId: opts.chatId,
          userId: opts.userId,
        });
      }
    },
  });

  // Register resumable SSE stream and return it
  const streamId = crypto.randomUUID();

  // Set active stream id for this chat
  await updateChatActiveStreamId({ chatId: opts.chatId, streamId });

  // Convert to SSE
  const sse = stream.pipeThrough(new JsonToSseTransformStream());

  // Split the SSE stream into two branches to avoid locking the body
  const [sseForClient, sseForResumable] = sse.tee();

  // Create resumable stream
  const streamContext = createResumableStreamContext({ waitUntil: after });
  await streamContext.createNewResumableStream(streamId, () => sseForResumable);

  return new Response(sseForClient, { headers: UI_MESSAGE_STREAM_HEADERS });
};

export async function askDeepSearch(
  messages: UIMessage[],
  opts: { langfuseTraceId?: string } = {},
): Promise<string> {
  // For evals, we need to use the original runAgentLoop directly
  // since we need the text result, not the streaming response
  // Create a proper no-op writer implementation
  const noOpWriter: Parameters<typeof runAgentLoop>[1] = {
    write() {
      // No-op: evaluations don't need real-time data parts streaming
    },
    merge() {
      // No-op: no merging needed for eval usage
    },
    onError() {
      // No-op: error handling happens at higher level
    },
  };

  const { result } = await runAgentLoop(messages, noOpWriter, {
    langfuseTraceId: opts.langfuseTraceId,
  });

  // Consume the stream and return the text
  await result.consumeStream();
  return await result.text;
}
