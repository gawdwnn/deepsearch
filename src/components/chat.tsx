"use client";

import { useChat } from "@ai-sdk/react";
import { type UIMessage, DefaultChatTransport } from "ai";
import { Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import type { ActionStep } from "~/types/messages";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string | undefined;
  isNewChat: boolean;
  initialMessages?: UIMessage[];
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  isNewChat,
  initialMessages,
}: ChatProps) => {
  const router = useRouter();

  const [generatedChatId] = useState(() =>
    isNewChat ? crypto.randomUUID() : null,
  );

  const { messages, status, sendMessage } = useChat({
    id: isNewChat ? generatedChatId! : (chatId!),
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareReconnectToStreamRequest: ({ id }) => ({
        api: `/api/chat/${id}/stream`,
        credentials: "include",
      }),
    }),
    messages: initialMessages,
    resume: true,
    onData: (dataPart) => {
      if (dataPart.type === "data-action-step") {
        const stepData = dataPart.data as ActionStep;

        setLiveActionSteps((prev) => {
          const existing = prev.find((s) => s.id === stepData.id);
          return existing
            ? prev.map((s) => (s.id === stepData.id ? stepData : s))
            : [...prev, stepData];
        });
      }
    },
  });
  const [input, setInput] = useState("");
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [liveActionSteps, setLiveActionSteps] = useState<ActionStep[]>([]);

  useEffect(() => {
    if (
      isNewChat &&
      hasSentFirstMessage &&
      messages.length > 0 &&
      status === "ready" &&
      generatedChatId
    ) {
      router.push(`?id=${generatedChatId}`);
    }
  }, [
    isNewChat,
    hasSentFirstMessage,
    messages.length,
    status,
    router,
    generatedChatId,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    if (input.trim()) {
      setLiveActionSteps([]);

      void sendMessage(
        { text: input.trim() },
        {
          body: {
            chatId: isNewChat ? generatedChatId : chatId,
          },
        },
      );
      setInput("");
      if (isNewChat) {
        setHasSentFirstMessage(true);
      }
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <StickToBottom
          className="relative mx-auto w-full max-w-[65ch] flex-1 overflow-auto [&>div]:overflow-y-auto [&>div]:p-4 [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 [&>div]:hover:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
          role="log"
          aria-label="Chat messages"
        >
          <StickToBottom.Content className="flex flex-col gap-4">
            <ChatMessage
              messages={messages}
              userName={userName}
              liveActionSteps={liveActionSteps}
            />
          </StickToBottom.Content>
        </StickToBottom>

        <div className="border-t border-gray-700">
          <form onSubmit={handleSubmit} className="mx-auto max-w-[65ch] p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={
                  isAuthenticated
                    ? "Say something..."
                    : "Sign in to start chatting..."
                }
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {status === "streaming" ? (
                  <Square className="size-4" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
