import { evalite } from "evalite";
import { askDeepSearch } from "~/lib/deep-search";
import { Factuality } from "./scorers/factuality";
import { AnswerRelevancy } from "./scorers/answer-relevancy";
import { devData } from "./dev";
import { ciData } from "./ci";
import { regressionData } from "./regression";
import { env } from "~/lib/env";

const data = [...devData];

if (env.EVAL_DATASET === "ci") {
  data.push(...ciData);
} else if (env.EVAL_DATASET === "regression") {
  data.push(...ciData, ...regressionData);
}

evalite("Deep Search Eval", {
  data: () => data,
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
    AnswerRelevancy,
  ],
});