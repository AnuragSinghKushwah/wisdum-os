/**
 * Generic full-text search primitive backing Meilisearch (or an in-memory
 * stand-in) behind a vendor-neutral interface. The richer indexing and
 * ranking pipeline (Phase 15) builds on top of this.
 */
export interface SearchProvider {
  index(indexName: string, documentId: string, text: string): Promise<void>;
  remove(indexName: string, documentId: string): Promise<void>;
  query(
    indexName: string,
    text: string,
    limit: number,
    offset: number,
  ): Promise<readonly { documentId: string; score: number }[]>;
}
