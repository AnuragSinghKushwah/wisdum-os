import type { LlmCompletionPort } from '@wisdum/application';
import { ConfigurationError } from '@wisdum/errors';
import type { LlmProvider } from '@wisdum/platform-ai';

const MAX_OUTPUT_TOKENS = 1500;

/**
 * Stands in for `LlmCompletionPort` when no AI provider is configured, so
 * handlers that need one (content draft generation, the reasoning pass)
 * can always be constructed — they only fail, clearly, at the moment they
 * actually try to call the model.
 */
export class NullLlmCompletionPort implements LlmCompletionPort {
  complete(): Promise<string> {
    throw new ConfigurationError(
      'No AI provider is configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)',
    );
  }
}

export function createLlmCompletionPort(
  provider: LlmProvider | undefined,
  model: string | undefined,
): LlmCompletionPort {
  return provider !== undefined && model !== undefined
    ? new LlmCompletionAdapter(provider, model)
    : new NullLlmCompletionPort();
}

/** Adapts the vendor-neutral `LlmProvider` (platform/ai) to the application layer's `LlmCompletionPort`. */
export class LlmCompletionAdapter implements LlmCompletionPort {
  constructor(
    private readonly provider: LlmProvider,
    private readonly model: string,
  ) {}

  async complete(prompt: string): Promise<string> {
    const result = await this.provider.complete({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    return result.content;
  }
}
