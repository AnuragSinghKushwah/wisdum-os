import { OpenAiLlmProvider } from './openai-llm-provider.js';
import type { OpenAiClientLike } from './openai-llm-provider.js';
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from './llm-provider.js';

/** NVIDIA's hosted NIM API (build.nvidia.com). A self-hosted NIM container is reached at its own URL. */
export const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

/**
 * Reasoning models served through NIM can put their thinking in front of the answer as a
 * `<think>…</think>` block. That is not part of the answer and must not end up in a draft.
 */
function withoutLeadingThinking(content: string): string {
  return content.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '');
}

/**
 * Keeps the models that can write text. The catalog also serves embedding, ranking, safety and
 * document-parsing models, which would only mislead someone choosing a model to write with.
 */
export function nimChatModels(ids: readonly string[]): readonly string[] {
  return ids.filter((id) => !/embed|rerank|guard|safety|reward|parse|retriev|clip/i.test(id));
}

/**
 * NVIDIA NIM speaks the OpenAI Chat Completions protocol, so this reuses that adapter. What it adds:
 * model ids are sent exactly as configured, because NIM's own ids are `namespace/name`, and there is
 * no built-in model, because the hosted catalog retires models (`meta/llama-3.3-70b-instruct` was
 * switched off on 2026-08-26), so any name written here would go stale.
 */
export class NvidiaNimLlmProvider implements LlmProvider {
  private readonly inner: OpenAiLlmProvider;

  constructor(client: OpenAiClientLike) {
    this.inner = new OpenAiLlmProvider(client, { verbatimModelIds: true });
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (request.model.trim().length === 0) {
      throw new Error(
        'No NVIDIA NIM model is set. Set REASONING_LLM_MODEL to a model id from build.nvidia.com/models, written as it appears there (for example "nvidia/…" or "meta/…").',
      );
    }
    const result = await this.inner.complete({ ...request, model: request.model.trim() });
    return { ...result, content: withoutLeadingThinking(result.content) };
  }
}
