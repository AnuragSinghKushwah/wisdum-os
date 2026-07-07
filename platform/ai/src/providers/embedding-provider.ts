export interface EmbeddingRequest {
  readonly model: string;
  readonly input: readonly string[];
}

export interface EmbeddingResult {
  readonly vectors: readonly (readonly number[])[];
  readonly dimensions: number;
  readonly tokensUsed: number;
}

/** An embedding model behind a vendor-neutral contract. */
export interface EmbeddingProvider {
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
}
