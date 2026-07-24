import { describe, expect, it } from 'vitest';
import { LocalEmbeddingProvider } from './local-embedding-provider.js';

describe('LocalEmbeddingProvider', () => {
  it('runs the injected extractor per input and reports the configured dimensions with zero token usage', async () => {
    const seen: string[] = [];
    const provider = new LocalEmbeddingProvider(async (text) => {
      seen.push(text);
      return [text.length, 0, 0];
    }, 3);

    const result = await provider.embed({ model: 'local/test', input: ['ab', 'abcd'] });

    expect(seen).toEqual(['ab', 'abcd']);
    expect(result).toEqual({
      vectors: [[2, 0, 0], [4, 0, 0]],
      dimensions: 3,
      tokensUsed: 0,
    });
  });
});
