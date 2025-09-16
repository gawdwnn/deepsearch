import type { UIMessage } from "ai";

export const devData: { input: UIMessage[]; expected: string }[] = [
  {
    input: [
      {
        id: "1",
        role: "user",
        parts: [
          { type: "text", text: "What is the latest version of TypeScript?" },
        ],
      },
    ],
    expected: "The latest version of TypeScript is 5.9.2",
  },
];
