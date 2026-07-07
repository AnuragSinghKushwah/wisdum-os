import type { ToolDefinition } from './tool-provider.js';

export interface LlmMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
}

export interface LlmToolCallRequest {
  readonly toolName: string;
  readonly argumentsJson: string;
}

export interface LlmCompletionRequest {
  /** Fully qualified model reference, e.g. `anthropic/claude-sonnet-5`. */
  readonly model: string;
  readonly messages: readonly LlmMessage[];
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly tools?: readonly ToolDefinition[];
}

export type LlmFinishReason = 'stop' | 'length' | 'tool_call';

export interface LlmCompletionResult {
  readonly content: string;
  readonly toolCalls: readonly LlmToolCallRequest[];
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly finishReason: LlmFinishReason;
}

/**
 * A text-generation model behind a vendor-neutral contract. Concrete
 * providers (Anthropic, OpenAI, a local runtime) integrate as plugins —
 * the core platform never imports a vendor SDK directly.
 */
export interface LlmProvider {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}
