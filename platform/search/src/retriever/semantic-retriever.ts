import { SearchResult } from '@wisdum/domain';
import type { SearchSourceType } from '@wisdum/domain';
import type { EmbeddingProvider } from '@wisdum/platform-ai';
import type { UUID } from '@wisdum/types';
import type { VectorStore } from '../vector-store/vector-store.js';
import type { RetrievalRequest, Retriever } from './retriever.js';

/** Retrieves via nearest-neighbor vector search after embedding the query text. */
export class SemanticRetriever implements Retriever {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly embeddings: EmbeddingProvider,
    private readonly model: string,
    private readonly sourceType: SearchSourceType = 'knowledge',
  ) {}

  async retrieve(request: RetrievalRequest): Promise<readonly SearchResult[]> {
    const embedded = await this.embeddings.embed({ model: this.model, input: [request.text] });
    const queryVector = embedded.vectors[0] ?? [];
    const hits = await this.vectorStore.query(request.searchIndexId, queryVector, request.limit);
    return hits.map((hit) =>
      SearchResult.create({
        sourceId: sourceIdFromVectorId(hit.id) as UUID,
        sourceType: this.sourceType,
        score: hit.score,
      }),
    );
  }
}

/** Vector ids are `${sourceId}#${chunkIndex}` (see `DefaultEmbeddingPipeline`). */
function sourceIdFromVectorId(vectorId: string): string {
  return vectorId.slice(0, vectorId.indexOf('#'));
}
