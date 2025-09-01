import { evalite } from "evalite";
import { askDeepSearch } from "~/lib/deep-search";
import type { UIMessage } from "ai";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: UIMessage[] }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "What is the latest version of TypeScript?" }],
          },
        ],
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            parts: [{ type: "text", text: "What are the main features of Next.js 15?" }],
          },
        ],
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
  ],
});