import type { MessagePart } from "~/types";
import { Markdown } from "./markdown";
import { ToolInvocation } from "./tool-invocation";

interface ChatMessageProps {
  parts: MessagePart[] | undefined;
  role: string;
  userName: string;
}

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  if (!parts || parts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="prose prose-invert max-w-none">
          {parts.map((part, index) => {
            if (part.type === "text") {
              return <Markdown key={index}>{part.text}</Markdown>;
            } else if (part.type.startsWith("tool-")) {
              return <ToolInvocation key={index} part={part} />;
            } else {
              // Handle any other parts that might exist but aren't implemented yet
              return (
                <div key={index} className="mb-2 text-sm text-gray-500">
                  [Unsupported part type: {part.type}]
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};
