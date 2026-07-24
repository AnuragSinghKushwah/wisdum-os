import type { EmbeddingProvider, EmbeddingRequest, EmbeddingResult } from './embedding-provider.js';

/**
 * The subset of the `openai` SDK's client this adapter depends on.
 * Keeping the dependency this narrow lets the provider be unit-tested
 * against an in-process fake instead of a real OpenAI account.
 */
export interface OpenAiEmbeddingClientLike {
  embeddings: {
    create(params: { model: string; input: string[] }): Promise<{
      data: { embedding: number[] }[];
      usage?: { total_tokens?: number };
    }>;
  };
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly client: OpenAiEmbeddingClientLike) {}

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: request.model,
      input: [...request.input],
    });

    const vectors = response.data.map((item) => item.embedding);

    return {
      vectors,
      dimensions: vectors[0]?.length ?? 0,
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }
}
