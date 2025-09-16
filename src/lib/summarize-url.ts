import { generateText } from "ai";

import { summarizationModel } from "~/types/models";
import { cache } from "~/lib/redis";
import { logger } from "~/utils/logger";

export interface SummarizeURLInput {
  conversationHistory: string;
  scrapedContent: string;
  searchMetadata: {
    title: string;
    url: string;
    date: string;
    snippet: string;
  };
  query: string;
  langfuseTraceId?: string;
}

export interface SummarizeURLResponse {
  success: true;
  summary: string;
  url: string;
}

export interface SummarizeURLErrorResponse {
  success: false;
  error: string;
  url: string;
}

export type SummarizeURLResult =
  | SummarizeURLResponse
  | SummarizeURLErrorResponse;

const summarizeURLInternal = async (
  input: SummarizeURLInput,
): Promise<SummarizeURLResult> => {
  try {
    const {
      conversationHistory,
      scrapedContent,
      searchMetadata,
      query,
      langfuseTraceId,
    } = input;

    if (!scrapedContent.trim()) {
      return {
        success: false,
        error: "No content to summarize",
        url: searchMetadata.url,
      };
    }

    const result = await generateText({
      model: summarizationModel,
      ...(langfuseTraceId && {
        experimental_telemetry: {
          isEnabled: true,
          functionId: "summarize-url",
          metadata: {
            langfuseTraceId,
            url: searchMetadata.url,
          },
        },
      }),
      system: `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.`,
      prompt: `## Research Topic ${query}

## Conversation Context ${conversationHistory}

## Source Information
- **Title**: ${searchMetadata.title}
- **URL**: ${searchMetadata.url}
- **Date**: ${searchMetadata.date || "Not specified"}
- **Preview**: ${searchMetadata.snippet}

## Content to Summarize ${scrapedContent}

Please create a detailed synthesis of this content as it relates to the research topic "${query}". Focus on extracting and organizing the most valuable information while maintaining the integrity of the source material.`,
      maxOutputTokens: 1000,
    });

    return {
      success: true,
      summary: result.text,
      url: searchMetadata.url,
    };
  } catch (error) {
    logger.error("URL summarization failed", {
      error: error instanceof Error ? error.message : String(error),
      url: input.searchMetadata.url,
      query: input.query,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      url: input.searchMetadata.url,
    };
  }
};

export const summarizeURL = cache<
  SummarizeURLResult,
  [SummarizeURLInput],
  (input: SummarizeURLInput) => Promise<SummarizeURLResult>
>("summarizeURL", summarizeURLInternal);
