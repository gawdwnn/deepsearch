import type { UIMessage } from "ai";

export const regressionData: { input: UIMessage[]; expected: string }[] = [
  {
    input: [
      {
        id: "3",
        role: "user",
        parts: [{ type: "text", text: "What is React Server Components?" }],
      },
    ],
    expected:
      "React Server Components (RSC) is a new feature that allows components to render on the server, reducing client-side JavaScript bundle size and improving performance. They run during build time or request time on the server, can directly access backend resources like databases, and send a serialized representation to the client.",
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        parts: [
          {
            type: "text",
            text: "How do I implement authentication in Next.js?",
          },
        ],
      },
    ],
    expected:
      "Next.js authentication can be implemented using NextAuth.js, which supports multiple providers (OAuth, email, credentials), session management, and database adapters. It provides built-in security features, CSRF protection, and supports both client-side and server-side authentication patterns with middleware for route protection.",
  },
  {
    input: [
      {
        id: "5",
        role: "user",
        parts: [
          {
            type: "text",
            text: "What are the benefits of using TypeScript with React?",
          },
        ],
      },
    ],
    expected:
      "TypeScript with React provides static type checking, better IDE support with autocomplete and refactoring, early error detection, improved code documentation through type definitions, better component prop validation, and enhanced developer experience with intellisense and debugging capabilities.",
  },
];
