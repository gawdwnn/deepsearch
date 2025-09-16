import type { UIMessage } from 'ai';

export type MessagePart = NonNullable<UIMessage["parts"]>[number];
export interface ActionStep {
  id: string;
  action: 'plan' | 'search' | 'continue' | 'answer';
  title: string;
  reasoning: string;
  phase: 'starting' | 'in_progress' | 'completed' | 'failed';
  timestamp: number;
  metadata?: {
    plan?: string;
    queries?: string[];
    query?: string;
    urls?: string[];
    resultCount?: number;
    scrapedCount?: number;
    summarizedCount?: number;
    duration?: number;
    error?: string;
  };
}

// Message-level metadata (timestamps, tokens, etc.)
export interface MessageMetadata {
  createdAt?: number;
  model?: string;
  totalTokens?: number;
  userId?: string;
  processingTime?: number;
}

// AI SDK v5 Data Parts types
export interface DataParts {
  'action-steps': {
    steps: ActionStep[];
    currentStep?: string; // ID of currently active step
  };
  'action-step': ActionStep; // Individual step for transient streaming
  'citations': {
    sources: Array<{
      url: string;
      title: string;
      relevance: number;
    }>;
  };
  'search-results': {
    query: string;
    results: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
  };
  // Index signature required for UIDataTypes constraint
  [key: string]: unknown;
}

// Typed UIMessage for this application
export type DeepSearchUIMessage = UIMessage<MessageMetadata, DataParts>;

// Action step helpers
export const createActionStep = (
  id: string,
  action: ActionStep['action'],
  title: string,
  reasoning: string
): ActionStep => ({
  id,
  action,
  title,
  reasoning,
  phase: 'starting',
  timestamp: Date.now(),
});

export const updateActionStep = (
  step: ActionStep,
  updates: Partial<Pick<ActionStep, 'phase' | 'metadata'>>
): ActionStep => ({
  ...step,
  ...updates,
  timestamp: Date.now(),
});