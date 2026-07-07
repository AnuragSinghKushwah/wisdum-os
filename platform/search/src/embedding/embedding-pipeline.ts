export interface EmbeddingPipelineRequest {
  readonly indexName: string;
  readonly sourceId: string;
  readonly text: string;
  readonly model: string;
}

export interface EmbeddingPipelineResult {
  readonly chunkCount: number;
}

/**
 * Chunks source text, embeds each chunk, and upserts the vectors into a
 * `VectorStore`. This is what turns a knowledge asset's content into
 * semantically searchable vectors.
 */
export interface EmbeddingPipeline {
  run(request: EmbeddingPipelineRequest): Promise<EmbeddingPipelineResult>;
  remove(indexName: string, sourceId: string, chunkCount: number): Promise<void>;
}
