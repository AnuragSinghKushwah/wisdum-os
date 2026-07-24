import type { EmbeddingProvider, EmbeddingRequest, EmbeddingResult } from './embedding-provider.js';

/** Produces a single embedding vector for one string, run in-process (no network call). */
export type FeatureExtractor = (text: string) => Promise<readonly number[]>;

/**
 * Local, offline `EmbeddingProvider` fallback for when no vendor API key is
 * configured. The extractor is injected rather than loaded here so this
 * class stays unit-testable without downloading a real model — see
 * `local-embedding-runtime.ts` for the concrete `@xenova/transformers` loader
 * used at the composition root.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly extract: FeatureExtractor,
    private readonly dimensions: number,
  ) {}

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const vectors = await Promise.all(request.input.map((text) => this.extract(text)));

    return {
      vectors,
      dimensions: this.dimensions,
      tokensUsed: 0,
    };
  }
}
