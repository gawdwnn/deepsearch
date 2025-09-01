import type { MessagePart } from "~/types";

interface ToolInvocationProps {
  part: MessagePart;
}

export const ToolInvocation = ({ part }: ToolInvocationProps) => {
  // Check if this is a tool part type and handle accordingly
  if (!part.type.startsWith("tool-")) {
    return null;
  }

  // Type assertions for tool parts - we know these exist on tool parts
  const toolPart = part as Record<string, string>;
  const state = toolPart.state;
  const input = toolPart.input;
  const output = toolPart.output;
  const toolType = toolPart.type;

  return (
    <div className="mb-4 rounded-lg border border-gray-600 bg-gray-800 p-4">
      <div className="mb-2 flex flex-col gap-2">
        <div>
          <span className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white">
            Tool Call
          </span>
          <span className="text-sm text-gray-300">{toolType}</span>
        </div>
        <div>
          <span className="rounded bg-gray-600 px-2 py-1 text-xs text-gray-300">
            state:
          </span>
          <span className="text-sm text-gray-300">{state}</span>
        </div>
      </div>

      {input ? (
        <div className="mb-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-400">Input:</h4>
          <pre className="overflow-x-auto rounded bg-gray-700 p-2 text-sm text-gray-300">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      ) : null}

      {output ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-400">Output:</h4>
          <pre className="overflow-x-auto rounded bg-gray-700 p-2 text-sm text-gray-300">
            {typeof output === "string"
              ? output
              : JSON.stringify(output, null, 2)}
          </pre>
        </div>
      ) : null}

      {/* Debug info - show the raw part structure */}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-gray-500">
          Debug: Raw Part Data
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-700 p-2 text-xs text-gray-300">
          {JSON.stringify(part, null, 2)}
        </pre>
      </details>
    </div>
  );
};
