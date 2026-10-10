import { describe, expect, it } from 'vitest';
import { nimChatModels, NvidiaNimLlmProvider } from './nvidia-nim-llm-provider.js';
import type { OpenAiClientLike, OpenAiCreateParams } from './openai-llm-provider.js';

function providerReplying(content: string, seen: OpenAiCreateParams[] = []): NvidiaNimLlmProvider {
  const client: OpenAiClientLike = {
    chat: {
      completions: {
        create: (params) => {
          seen.push(params);
          return Promise.resolve({
            choices: [{ message: { content }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 3, completion_tokens: 2 },
          });
        },
      },
    },
  };
  return new NvidiaNimLlmProvider(client);
}

const ask = (model: string) => ({ model, messages: [{ role: 'user' as const, content: 'Hi' }] });

describe('NvidiaNimLlmProvider', () => {
  it.each([
    'meta/llama-3.1-8b-instruct',
    'nvidia/nemotron-3-super-120b-a12b',
    'openai/gpt-oss-120b',
  ])('sends %s to NIM exactly as configured', async (model) => {
    const seen: OpenAiCreateParams[] = [];

    await providerReplying('ok', seen).complete(ask(model));

    expect(seen[0]?.model).toBe(model);
  });

  it('returns the answer with the usage the server reported', async () => {
    const result = await providerReplying('Hello there').complete(
      ask('meta/llama-3.1-8b-instruct'),
    );

    expect(result).toMatchObject({
      content: 'Hello there',
      inputTokens: 3,
      outputTokens: 2,
      finishReason: 'stop',
    });
  });

  it('refuses to guess a model, and says which setting to change', async () => {
    const seen: OpenAiCreateParams[] = [];

    await expect(providerReplying('ok', seen).complete(ask('  '))).rejects.toThrow(
      /REASONING_LLM_MODEL/,
    );
    expect(seen).toHaveLength(0);
  });

  it("drops a reasoning model's leading <think> block, which is not part of the answer", async () => {
    const result = await providerReplying(
      '<think>\nThe user wants a post. Keep it short.\n</think>\n\nThe actual post.',
    ).complete(ask('nvidia/nemotron-3-super-120b-a12b'));

    expect(result.content).toBe('The actual post.');
  });

  it('leaves an answer alone when the tag is not at its start or never closes', async () => {
    const inside = 'Wrap reasoning in <think>…</think> tags when you want it hidden.';
    const unclosed = '<think>still thinking when the limit was reached';

    expect((await providerReplying(inside).complete(ask('m/x'))).content).toBe(inside);
    expect((await providerReplying(unclosed).complete(ask('m/x'))).content).toBe(unclosed);
  });
});

describe('nimChatModels', () => {
  it('keeps the models that write text and drops embedding, ranking, safety and parsing models', () => {
    expect(
      nimChatModels([
        'meta/llama-3.1-8b-instruct',
        'nvidia/nemotron-3-embed-1b',
        'nvidia/llama-3.2-nv-rerankqa-1b-v2',
        'nvidia/llama-3.1-nemotron-safety-guard-8b-v3',
        'nvidia/nemotron-4-340b-reward',
        'nvidia/nemotron-parse',
        'openai/gpt-oss-120b',
      ]),
    ).toEqual(['meta/llama-3.1-8b-instruct', 'openai/gpt-oss-120b']);
  });
});
