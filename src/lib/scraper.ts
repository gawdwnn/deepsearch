import { Firecrawl } from "@mendable/firecrawl-js";
import { cache } from "~/lib/redis";
import { env } from "~/lib/env";

const firecrawl = new Firecrawl({
  apiKey: env.FIRECRAWL_API_KEY,
});

export interface ScrapeSuccessResponse {
  success: true;
  data: string;
  url: string;
  metadata?: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
}

export interface ScrapeErrorResponse {
  success: false;
  error: string;
  url: string;
}

export type ScrapeResponse = ScrapeSuccessResponse | ScrapeErrorResponse;

export interface BulkScrapeSuccessResponse {
  success: true;
  results: ScrapeResponse[];
}

export interface BulkScrapeFailureResponse {
  success: false;
  results: ScrapeResponse[];
  error: string;
}

export type BulkScrapeResponse =
  | BulkScrapeSuccessResponse
  | BulkScrapeFailureResponse;


export const scrapePages = cache<
  BulkScrapeResponse,
  [string[]],
  (urls: string[]) => Promise<BulkScrapeResponse>
>("scrapePages", async (urls: string[]): Promise<BulkScrapeResponse> => {
  try {
    // Use Firecrawl's batch scraping for multiple URLs
    const result = await firecrawl.batchScrape(urls, {
      options: {
        formats: ["markdown"],
      },
    });

    if (result.status === "completed" && result.data) {
      const successfulResults: ScrapeSuccessResponse[] = [];
      const failedResults: ScrapeErrorResponse[] = [];

      result.data.forEach((item, index: number) => {
        if (item.markdown) {
          successfulResults.push({
            success: true,
            data: item.markdown,
            url: urls[index] ?? "unknown",
            metadata: item.metadata,
          });
        } else {
          failedResults.push({
            success: false,
            error: "No content extracted",
            url: urls[index] ?? "unknown",
          });
        }
      });

      // Always return success: true, include both successful and failed results
      return {
        success: true,
        results: [...successfulResults, ...failedResults],
      };
    }

    return {
      success: false,
      results: [],
      error: `Batch scrape failed with status: ${result.status}`,
    };
  } catch (error) {
    return {
      success: false,
      results: [],
      error:
        error instanceof Error ? error.message : String(error),
    };
  }
});
