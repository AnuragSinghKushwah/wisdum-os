import type { ConversationMessage } from '@wisdum/domain';
import type { LlmMessage } from '../providers/llm-provider.js';

export interface ContextBuildRequest {
  readonly systemPrompt?: string;
  readonly history: readonly ConversationMessage[];
  readonly maxContextTokens: number;
}

/**
 * Assembles the message list sent to an LLM: system prompt, then as much
 * conversation history as fits the model's context window. Token
 * accounting here is an estimate — the model provider reports real usage
 * back on the completion result.
 */
export interface ContextBuilder {
  build(request: ContextBuildRequest): readonly LlmMessage[];
}
