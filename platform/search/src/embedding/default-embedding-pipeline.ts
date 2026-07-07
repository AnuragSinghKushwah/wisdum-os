import type { EmbeddingProvider } from '@wisdum/platform-ai';
import type { Chunker } from '../chunker/chunker.js';
import type { VectorStore } from '../vector-store/vector-store.js';
import type {
  EmbeddingPipeline,
  EmbeddingPipelineRequest,
  EmbeddingPipelineResult,
} from './embedding-pipeline.js';

const DEFAULT_CHUNK_CHARS = 1000;
const DEFAULT_OVERLAP_CHARS = 100;

function vectorId(sourceId: string, chunkIndex: number): string {
  return `${sourceId}#${chunkIndex}`;
}

/** Reference EmbeddingPipeline: fixed-size chunking, one embedding call per document. */
export class DefaultEmbeddingPipeline implements EmbeddingPipeline {
  constructor(
    private readonly chunker: Chunker,
    private readonly embeddings: EmbeddingProvider,
    private readonly vectorStore: VectorStore,
  ) {}

  async run(request: EmbeddingPipelineRequest): Promise<EmbeddingPipelineResult> {
    const chunks = this.chunker.chunk(request.text, {
      maxChunkChars: DEFAULT_CHUNK_CHARS,
      overlapChars: DEFAULT_OVERLAP_CHARS,
    });
    if (chunks.length === 0) return { chunkCount: 0 };

    const embedded = await this.embeddings.embed({
      model: request.model,
      input: chunks.map((chunk) => chunk.text),
    });

    await this.vectorStore.upsert(
      request.indexName,
      chunks.map((chunk, position) => ({
        id: vectorId(request.sourceId, chunk.index),
        vector: embedded.vectors[position] ?? [],
        metadata: { sourceId: request.sourceId, chunkIndex: chunk.index },
      })),
    );

    return { chunkCount: chunks.length };
  }

  remove(indexName: string, sourceId: string, chunkCount: number): Promise<void> {
    const ids = Array.from({ length: chunkCount }, (_, index) => vectorId(sourceId, index));
    return this.vectorStore.delete(indexName, ids);
  }
}
