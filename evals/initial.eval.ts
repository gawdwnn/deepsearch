import { evalite } from "evalite";
import { askDeepSearch } from "~/lib/deep-search";
import type { UIMessage } from "ai";
import { Factuality } from "./scorers/factuality";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: UIMessage[]; expected: string }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "What is the latest version of TypeScript?" }],
          },
        ],
        expected: "The latest version of TypeScript is 5.9.2",
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            parts: [{ type: "text", text: "What are the main features of Next.js 15?" }],
          },
        ],
        expected: `React 19 Support: Next.js 15 provides full support for React 19, both in the App Router and Pages Router. This includes new features and improvements from React 19, such as sibling pre-warming and new hooks like useActionState, useFormStatus, and useOptimistic.
Turbopack Dev (Stable): Turbopack is now stable for development, offering performance and stability improvements. It can lead to significantly faster local server startup and code updates.
Caching Improvements: Caching semantics have been adjusted, with GET Route Handlers and the Client Router Cache no longer cached by default. Developers can opt-in to caching as needed.
Async Request APIs: APIs that rely on request-specific data (headers, cookies, params, searchParams) are transitioning to be asynchronous.
Form Component: A new Form component extends the HTML form element, adding prefetching, client-side navigation, and progressive enhancement for forms that navigate to a new page.
instrumentation.js (Stable): The instrumentation file and register() API are now stable, allowing integration with observability libraries. A new onRequestError hook has been added in collaboration with Sentry.
TypeScript Support for next.config.ts: Next.js now supports the TypeScript next.config.ts file type, providing a NextConfig type for autocompletion and type-safe options.
Enhanced Security for Server Actions: Unused Server Actions won't have their IDs exposed, and secure, unguessable action IDs are created.
Improved Error Debugging: Improvements to error debugging include enhanced source maps, collapsed stack frames, and enhanced profiling.
after API (Stable): The after() API is now stable, allowing code to be executed after a response has finished streaming.
forbidden and unauthorized APIs (Experimental): These new APIs enable more granular authentication error handling with customizable UIs via forbidden.tsx and unauthorized.tsx.
Static Route Indicator: A visual indicator during development helps identify static routes.`,
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Check for [text](url) format with http/https URLs
        const inlineLinkRegex = /\[.+?\]\(https?:\/\/.+?\)/;
        
        // Check for [text][reference] format 
        const referenceLinkRegex = /\[.+?\]\[.+?\]/;
        
        const containsInlineLinks = inlineLinkRegex.test(output);
        const containsReferenceLinks = referenceLinkRegex.test(output);
        
        const containsLinks = containsInlineLinks || containsReferenceLinks;

        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
  ],
});