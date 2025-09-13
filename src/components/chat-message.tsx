import type { UIMessage } from "ai";
import type { ActionStep } from "~/types/messages";
import { Markdown } from "./markdown";
import { ToolInvocation } from "./tool-invocation";
import { CollapsibleProgress } from "./collapsible-progress";

interface ChatMessageProps {
  messages: UIMessage[];
  userName: string;
}

export const ChatMessage = ({ messages, userName }: ChatMessageProps) => {
  return (
    <>
      {messages.map((message, index) => {
        if (!message.parts || message.parts.length === 0) {
          return null;
        }
        
        const isAI = message.role === "assistant";

        return (
          <div key={message.id || index} className="mb-6">
            <div
              className={`rounded-lg p-4 ${
                isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
              }`}
            >
              <p className="mb-2 text-sm font-semibold text-gray-400">
                {isAI ? "AI" : userName}
              </p>

              {/* Show action steps for AI messages (persisted or live) */}
              {isAI && (() => {
                const actionPart = message.parts.find(part => part.type === 'data-action-steps');
                if (actionPart && 'data' in actionPart) {
                  const actionData = actionPart.data as { steps?: ActionStep[] };
                  if (actionData?.steps?.length) {
                    return (
                      <CollapsibleProgress 
                        actionSteps={actionData.steps}
                        defaultExpanded={false}
                      />
                    );
                  }
                }
                return null;
              })()}

              <div className="prose prose-invert max-w-none">
                {message.parts.map((part, partIndex) => {
                  if (part.type === "text") {
                    return <Markdown key={partIndex}>{part.text}</Markdown>;
                  } else if (part.type.startsWith("tool-")) {
                    return <ToolInvocation key={partIndex} part={part} />;
                  } else if (part.type === "data-action-steps") {
                    // Action steps parts are handled above in CollapsibleProgress component
                    return null;
                  }
                  // Ignore all other part types
                  return null;
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
