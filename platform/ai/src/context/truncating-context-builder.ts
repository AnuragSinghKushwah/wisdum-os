import type { ContextBuildRequest, ContextBuilder } from './context-builder.js';
import type { LlmMessage } from '../providers/llm-provider.js';

const CHARS_PER_TOKEN_ESTIMATE = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * Includes the system prompt, then walks history from most recent to
 * oldest, keeping messages until the token budget is spent. Estimates
 * tokens by character count — good enough to bound context size, not a
 * substitute for the provider's own tokenizer.
 */
export class TruncatingContextBuilder implements ContextBuilder {
  build(request: ContextBuildRequest): readonly LlmMessage[] {
    const system: LlmMessage[] =
      request.systemPrompt !== undefined ? [{ role: 'system', content: request.systemPrompt }] : [];

    let budget =
      request.maxContextTokens - system.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const kept: LlmMessage[] = [];
    for (let i = request.history.length - 1; i >= 0; i -= 1) {
      const message = request.history[i];
      if (message === undefined) continue;
      const cost = estimateTokens(message.content);
      if (cost > budget) break;
      budget -= cost;
      kept.unshift({ role: message.role, content: message.content });
    }

    return [...system, ...kept];
  }
}
