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
  results: ScrapeSuccessResponse[];
}

export interface BulkScrapeFailureResponse {
  success: false;
  results: ScrapeResponse[];
  error: string;
}

export type BulkScrapeResponse =
  | BulkScrapeSuccessResponse
  | BulkScrapeFailureResponse;

export const scrapePage = cache<
  ScrapeResponse,
  [string],
  (url: string) => Promise<ScrapeResponse>
>("scrapePage", async (url: string): Promise<ScrapeResponse> => {
  try {
    const result = await firecrawl.scrape(url, {
      formats: ["markdown"],
    });

    if (result.markdown) {
      return {
        success: true,
        data: result.markdown,
        url,
        metadata: result.metadata,
      };
    }

    return {
      success: false,
      error: "Failed to extract content from page",
      url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown scraping error",
      url,
    };
  }
});

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

      if (failedResults.length > 0) {
        const errorSummary = failedResults
          .map((r) => `${r.url}: ${r.error}`)
          .join("\n");

        return {
          success: false,
          results: [...successfulResults, ...failedResults],
          error: `Failed to scrape some pages:\n${errorSummary}`,
        };
      }

      return {
        success: true,
        results: successfulResults,
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
        error instanceof Error ? error.message : "Unknown batch scraping error",
    };
  }
});
