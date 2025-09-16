import { tavily } from "@tavily/core";
import { env } from "~/lib/env";
import { cache } from "~/lib/redis";
import { logger } from "~/utils/logger";

export declare namespace TavilyTool {
  export interface SearchInput {
    query: string;
    num: number;
  }
}

export interface ProcessedSearchResult {
  date: string;
  title: string;
  url: string;
  snippet: string;
  summary: string;
}

interface TavilyApiResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    raw_content?: string;
    published_date?: string;
  }>;
  response_time?: string;
  request_id?: string;
}

const fetchFromTavily = cache<
  TavilyApiResponse,
  [string, number],
  (query: string, num: number, signal?: AbortSignal) => Promise<TavilyApiResponse>
>(
  "tavily",
  async (query: string, num: number, signal?: AbortSignal): Promise<TavilyApiResponse> => {
    // Early abort check
    if (signal?.aborted) {
      throw new DOMException('Operation was aborted', 'AbortError');
    }

    if (!env.TAVILY_API_KEY) {
      const error = "TAVILY_API_KEY is not set in .env";
      logger.error("Tavily configuration error", { error });
      throw new Error(error);
    }

    try {
      const tvly = tavily({
        apiKey: env.TAVILY_API_KEY,
      });

      // Add abort listener for cleanup if needed
      const abortHandler = () => {
        // Tavily SDK may not support cancellation directly
        // but we can at least fail fast on subsequent checks
      };

      signal?.addEventListener('abort', abortHandler);

      try {
        const response = await tvly.search(query, { num });

        // Final abort check before returning
        if (signal?.aborted) {
          throw new DOMException('Operation was aborted', 'AbortError');
        }

        return response as TavilyApiResponse;
      } finally {
        signal?.removeEventListener('abort', abortHandler);
      }
    } catch (error) {
      logger.error("Tavily API request failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
);

// Add date extraction and validation
const extractDate = (result: TavilyApiResponse['results'][0]): string => {
  // Try various date fields that Tavily might provide
  const dateFields = [
    result.published_date,
    // Add other potential date fields as discovered
  ];

  for (const dateField of dateFields) {
    if (dateField && typeof dateField === 'string') {
      // Validate and format date
      const date = new Date(dateField);
      if (!isNaN(date.getTime())) {
        const isoString = date.toISOString();
        const datePart = isoString.split('T')[0];
        return datePart ?? ""; // YYYY-MM-DD format
      }
    }
  }

  return ""; // Fall back to empty if no valid date found
};

// Create efficient content processing helper
const processContent = (content: string): { snippet: string; summary: string } => {
  if (!content) {
    return { snippet: "", summary: "" };
  }

  // Avoid multiple string operations
  const trimmedContent = content.trim();
  const snippet = trimmedContent.length > 200
    ? `${trimmedContent.slice(0, 200)}...`
    : trimmedContent;

  return {
    snippet,
    summary: trimmedContent,
  };
};

export const searchTavily = async (
  body: TavilyTool.SearchInput,
  signal?: AbortSignal,
): Promise<ProcessedSearchResult[]> => {
  const results = await fetchFromTavily(body.query, body.num, signal);

  // Process results efficiently
  const processedResults: ProcessedSearchResult[] = results.results.map((result) => {
    const { snippet, summary } = processContent(result.content);

    return {
      date: extractDate(result),
      title: result.title ?? "",
      url: result.url ?? "",
      snippet,
      summary,
    };
  });

  return processedResults;
};