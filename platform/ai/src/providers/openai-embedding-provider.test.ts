import { describe, expect, it } from 'vitest';
import { OpenAiEmbeddingProvider } from './openai-embedding-provider.js';
import type { OpenAiEmbeddingClientLike } from './openai-embedding-provider.js';

function fakeClient(
  respond: (
    params: Parameters<OpenAiEmbeddingClientLike['embeddings']['create']>[0],
  ) => Awaited<ReturnType<OpenAiEmbeddingClientLike['embeddings']['create']>>,
): OpenAiEmbeddingClientLike {
  return { embeddings: { create: (params) => Promise.resolve(respond(params)) } };
}

describe('OpenAiEmbeddingProvider', () => {
  it('forwards model/input and maps vectors, dimensions, and token usage', async () => {
    let seen: Parameters<OpenAiEmbeddingClientLike['embeddings']['create']>[0] | undefined;
    const provider = new OpenAiEmbeddingProvider(
      fakeClient((params) => {
        seen = params;
        return {
          data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
          usage: { total_tokens: 42 },
        };
      }),
    );

    const result = await provider.embed({
      model: 'text-embedding-3-small',
      input: ['hello', 'world'],
    });

    expect(seen).toEqual({ model: 'text-embedding-3-small', input: ['hello', 'world'] });
    expect(result).toEqual({
      vectors: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
      dimensions: 3,
      tokensUsed: 42,
    });
  });

  it('defaults dimensions to 0 and tokensUsed to 0 when the response has no vectors/usage', async () => {
    const provider = new OpenAiEmbeddingProvider(fakeClient(() => ({ data: [] })));

    const result = await provider.embed({ model: 'text-embedding-3-small', input: [] });

    expect(result).toEqual({ vectors: [], dimensions: 0, tokensUsed: 0 });
  });
});
