import type { UIMessage } from 'ai';

// Extract message part type from UIMessage
export type MessagePart = NonNullable<UIMessage["parts"]>[number];

// Define action step data structure following AI SDK v5 Data Parts pattern
export interface ActionStep {
  id: string;
  action: 'search' | 'answer';
  title: string;
  reasoning: string;
  phase: 'starting' | 'in_progress' | 'completed' | 'failed';
  timestamp: number;
  metadata?: {
    query?: string;
    urls?: string[];
    resultCount?: number;
    scrapedCount?: number;
    duration?: number;
    error?: string;
  };
}

// Define message-level metadata (NOT content - this is for timestamps, tokens, etc.)
export interface MessageMetadata {
  createdAt?: number;
  model?: string;
  totalTokens?: number;
  userId?: string;
  processingTime?: number;
}

// Define Data Parts types following AI SDK v5 pattern with index signature
export interface DataParts {
  'action-steps': {
    steps: ActionStep[];
    currentStep?: string; // ID of currently active step
  };
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

// Create typed UIMessage following AI SDK v5 generics pattern
export type DeepSearchUIMessage = UIMessage<MessageMetadata, DataParts>;

// Helper type for action step updates
export interface ActionStepUpdate {
  stepId: string;
  phase: ActionStep['phase'];
  metadata?: ActionStep['metadata'];
  timestamp: number;
}

// Validation helpers for AI SDK v5 message validation
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