/**
 * Writes to the physical index behind a `SearchQueryExecutor`'s read
 * side. The domain's `SearchIndex` aggregate only tracks which sources
 * are (or should be) indexed; actually storing searchable text is a
 * runtime concern implemented behind this port.
 */
export interface SearchIndexer {
  index(indexName: string, documentId: string, text: string): Promise<void>;
  remove(indexName: string, documentId: string): Promise<void>;
}
