
import type { UIMessage } from "ai";
import type { UserLocation } from "./location-context";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
};


const toQueryResult = (
  query: QueryResultSearchResult,
) =>
  [
    `### ${query.date} - ${query.title}`,
    query.url,
    query.snippet,
  ].join("\n\n");

export class SystemContext {
  /**
   * The full conversation message history
   */
  private messages: UIMessage[];

  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  /**
   * The user's location context
   */
  private readonly userLocation: UserLocation;

  constructor(messages: UIMessage[], userLocation?: UserLocation) {
    this.messages = messages;
    this.userLocation = userLocation ?? {};
  }

  shouldStop() {
    return this.step >= 10;
  }

  incrementStep() {
    this.step++;
  }

  getStepCount() {
    return this.step;
  }

  getMessageHistory(): string {
    return this.messages
      .map((message) => {
        const role = message.role === "user" ? "**User**" : "**Assistant**";
        
        const textParts = message.parts
          .filter((part) => part.type === "text" && "text" in part)
          .map((part) => (part as { text: string }).text)
          .join(" ");
          
        return textParts ? `${role}: ${textParts}` : `${role}: [No text content]`;
      })
      .join("\n\n");
  }

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getLocationContext(): string {
    const locationParts: string[] = [];
    
    if (this.userLocation.latitude && this.userLocation.longitude) {
      locationParts.push(`- lat: ${this.userLocation.latitude}`);
      locationParts.push(`- lon: ${this.userLocation.longitude}`);
    }
    
    if (this.userLocation.city) {
      locationParts.push(`- city: ${this.userLocation.city}`);
    }
    
    if (this.userLocation.country) {
      locationParts.push(`- country: ${this.userLocation.country}`);
    }
    
    if (locationParts.length === 0) {
      return "";
    }
    
    return `About the origin of user's request:
${locationParts.join('\n')}
`;
  }
}
