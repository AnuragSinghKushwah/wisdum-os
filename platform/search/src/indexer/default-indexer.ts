import type { EmbeddingPipeline } from '../embedding/embedding-pipeline.js';
import type { KeywordIndex } from '../retriever/keyword-index.js';
import type { IndexDocumentRequest, IndexDocumentResult, Indexer } from './indexer.js';

/** Reference Indexer: writes to the keyword index, then runs the embedding pipeline. */
export class DefaultIndexer implements Indexer {
  constructor(
    private readonly keywordIndex: KeywordIndex,
    private readonly embeddingPipeline: EmbeddingPipeline,
  ) {}

  async index(request: IndexDocumentRequest): Promise<IndexDocumentResult> {
    await this.keywordIndex.index(request.indexName, request.sourceId, request.text);
    return this.embeddingPipeline.run(request);
  }

  async remove(indexName: string, sourceId: string, chunkCount: number): Promise<void> {
    await this.keywordIndex.remove(indexName, sourceId);
    await this.embeddingPipeline.remove(indexName, sourceId, chunkCount);
  }
}
