import {
  streamText,
  stepCountIs,
  type TelemetrySettings,
  type UIMessage,
  convertToModelMessages,
} from "ai";
import { z } from "zod";

import { model } from "~/types/models";
import { searchSerper } from "~/lib/serper";
import { scrapePages } from "~/lib/scraper";
import { logger } from "~/utils/logger";

export const streamFromDeepSearch = (opts: {
  messages: UIMessage[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: convertToModelMessages(opts.messages),
    stopWhen: stepCountIs(10),
    system: `You are an AI assistant with web search and scraping capabilities.
CURRENT DATE: ${new Date().toISOString()} UTC

## Core Workflow

1. Search the web for relevant URLs using searchWeb
2. Select and scrape the most relevant pages using scrapePages
3. Synthesize information from multiple sources
4. Provide comprehensive answers with proper citations

## Search Guidelines

- For current/latest/recent queries: Use both specific dates and relative terms
  - Include "today", "this week", "latest", "recent" as appropriate
  - Can also use the current date when specificity helps
- Note publication dates and prioritize recent information
- Search for 10+ diverse sources when possible

## When to Scrape Pages

- User needs detailed information beyond search snippets
- Full article analysis or summarization required
- Search results lack sufficient context

## Citation Requirements

CRITICAL: All web-sourced information must include markdown citations

- Format: [descriptive text](URL)
- Never show raw URLs
- Example: [OpenAI announces GPT-4](https://example.com) ✓

## Response Standards

- State clearly if information is insufficient
- Distinguish between your knowledge and web-sourced content
- Explicitly mention information recency when relevant
`,
    tools: {
      searchWeb: {
        description: "Search the web for current information",
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .max(200)
            .describe("The query to search the web for"),
        }),
        execute: async (
          { query }: { query: string },
          { abortSignal }: { abortSignal?: AbortSignal },
        ) => {
          try {
            const results = await searchSerper(
              { q: query, num: 10 },
              abortSignal,
            );

            return (results.organic ?? []).map((result) => ({
              title: result.title,
              link: result.link,
              snippet: result.snippet,
              date: result.date,
            }));
          } catch (searchError) {
            logger.error("Search tool error", {
              error:
                searchError instanceof Error
                  ? searchError.message
                  : "Unknown error",
              query,
              searchProvider: "serper",
            });
            return [];
          }
        },
      },
      scrapePages: {
        description:
          "Scrape the full content of web pages and return clean markdown. Use this when you need the complete content of pages beyond search snippets.",
        inputSchema: z.object({
          urls: z.array(z.string().url()).describe("Array of URLs to scrape"),
        }),
        execute: async (
          { urls }: { urls: string[] },
          { abortSignal: _abortSignal }: { abortSignal?: AbortSignal },
        ) => {
          try {
            const result = await scrapePages(urls);
            return result;
          } catch (scrapeError) {
            logger.error("Scrape tool error", {
              error:
                scrapeError instanceof Error
                  ? scrapeError.message
                  : "Unknown error",
              urls,
              scrapeProvider: "firecrawl",
            });
            return {
              success: false,
              results: [],
              error:
                scrapeError instanceof Error
                  ? scrapeError.message
                  : "Unknown scraping error",
            };
          }
        },
      },
    },
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });

export async function askDeepSearch(messages: UIMessage[]) {
  const result = streamFromDeepSearch({
    messages: messages,
    onFinish: () => {
      // just a stub  
    },
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}