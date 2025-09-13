import type { UIMessage } from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import { runAgentLoop } from "./run-agent-loop";
import { upsertChat } from "~/lib/db/mutations";
import { logger } from "~/utils/logger";
import type { DeepSearchUIMessage } from "~/types/messages";

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

export const streamFromDeepSearch = async (opts: {
  messages: UIMessage[];
  langfuseTraceId: string;
} & PersistenceContext) => {

  // Create UI message stream with AI SDK v5 Data Parts
  const stream = createUIMessageStream<DeepSearchUIMessage>({
    execute: async ({ writer }) => {
      const agentResult = await runAgentLoop(opts.messages, writer, {
        langfuseTraceId: opts.langfuseTraceId,
      });
      writer.merge(agentResult.toUIMessageStream());
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
          if (textPart && "text" in textPart && typeof textPart.text === "string") {
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
      } catch (error) {
        logger.error("Failed to save chat messages", {
          error: error instanceof Error ? error.message : String(error),
          chatId: opts.chatId,
          userId: opts.userId,
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
};

export async function askDeepSearch(
  messages: UIMessage[],
  opts: { langfuseTraceId?: string } = {}
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
  
  const result = await runAgentLoop(messages, noOpWriter, {
    langfuseTraceId: opts.langfuseTraceId,
  });
  
  // Consume the stream and return the text
  await result.consumeStream();
  return await result.text;
}