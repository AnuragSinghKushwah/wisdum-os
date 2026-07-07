import type { ToolInvocation } from '../providers/tool-provider.js';

export interface ConversationTurnRequest {
  readonly conversationId: string;
  readonly userMessage: string;
  readonly systemPrompt?: string;
  readonly maxContextTokens?: number;
}

export interface ConversationTurnResult {
  readonly assistantMessage: string;
  readonly toolCalls: readonly ToolInvocation[];
}

/**
 * Orchestrates one conversation turn: append the user message, build
 * context, call the model, execute any requested tools, and append the
 * assistant's reply. The `Conversation` aggregate stays the source of
 * truth for the transcript — this runtime only drives it.
 */
export interface ConversationRuntime {
  runTurn(request: ConversationTurnRequest): Promise<ConversationTurnResult>;
}
