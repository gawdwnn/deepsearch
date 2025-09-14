
import type { UIMessage } from "ai";
import type { UserLocation } from "./location-context";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
  scrapeSuccess: boolean;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};



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
   * The history of all search queries and their scraped results
   */
  private searchHistory: SearchHistoryEntry[] = [];

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

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              result.scrapeSuccess ? `<scrape_result>\n${result.scrapedContent}\n</scrape_result>` : '<scrape_result>\nFailed to scrape content\n</scrape_result>',
            ].join("\n\n"),
          ),
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
