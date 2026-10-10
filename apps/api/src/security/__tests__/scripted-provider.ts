import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from '@wisdum/platform-ai';
import type { LlmSelection } from '../../container/modules/core-module.js';

/** A model that records what it was asked and answers deterministically, so no network is involved. */
export class ScriptedProvider implements LlmProvider {
  readonly requests: LlmCompletionRequest[] = [];

  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    this.requests.push(request);
    const prompt = request.messages.map((m) => m.content).join('\n');
    const kind = prompt.includes('LINKEDIN')
      ? 'LINKEDIN'
      : prompt.includes('X (TWITTER)')
        ? 'X'
        : 'OTHER';
    return Promise.resolve({
      content: `# ${kind} draft written by the scripted model`,
      toolCalls: [],
      inputTokens: 1,
      outputTokens: 1,
      finishReason: 'stop',
    });
  }
}

/** Backs `TestApi.start` with a scripted model instead of the offline mock. */
export const live = (provider: LlmProvider): { readonly llm: LlmSelection } => ({
  llm: { provider, model: 'test/scripted', name: 'scripted' },
});
