/**
 * Full-text query port a `KeywordRetriever` runs against. Shape-compatible
 * with `@wisdum/infrastructure`'s `SearchProvider` by design (structural
 * typing means an `InMemorySearchProvider` satisfies this with no explicit
 * dependency between the two packages).
 */
export interface KeywordIndex {
  index(indexName: string, documentId: string, text: string): Promise<void>;
  remove(indexName: string, documentId: string): Promise<void>;
  query(
    indexName: string,
    text: string,
    limit: number,
    offset: number,
  ): Promise<readonly { documentId: string; score: number }[]>;
}
