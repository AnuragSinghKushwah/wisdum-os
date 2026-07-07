export interface IndexDocumentRequest {
  readonly indexName: string;
  readonly sourceId: string;
  readonly text: string;
  readonly model: string;
}

export interface IndexDocumentResult {
  readonly chunkCount: number;
}

/**
 * Indexes one source document for both lexical and semantic retrieval.
 * The `SearchIndex` aggregate's membership bookkeeping (`@wisdum/domain`)
 * is a separate concern the application layer drives alongside this —
 * the indexer only performs the physical indexing work.
 */
export interface Indexer {
  index(request: IndexDocumentRequest): Promise<IndexDocumentResult>;
  remove(indexName: string, sourceId: string, chunkCount: number): Promise<void>;
}
