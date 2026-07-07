import type { SearchProvider } from './search-provider.js';

/**
 * Naive substring-matching search for development and tests. Scores by
 * fraction of query terms matched — good enough to exercise the pipeline,
 * not a ranking algorithm.
 */
export class InMemorySearchProvider implements SearchProvider {
  private readonly indexes = new Map<string, Map<string, string>>();

  index(indexName: string, documentId: string, text: string): Promise<void> {
    const index = this.indexes.get(indexName) ?? new Map<string, string>();
    index.set(documentId, text.toLowerCase());
    this.indexes.set(indexName, index);
    return Promise.resolve();
  }

  remove(indexName: string, documentId: string): Promise<void> {
    this.indexes.get(indexName)?.delete(documentId);
    return Promise.resolve();
  }

  query(
    indexName: string,
    text: string,
    limit: number,
    offset: number,
  ): Promise<readonly { documentId: string; score: number }[]> {
    const index = this.indexes.get(indexName);
    if (index === undefined) return Promise.resolve([]);

    const terms = text
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0);
    const scored = [...index.entries()]
      .map(([documentId, content]) => {
        const matched = terms.filter((term) => content.includes(term)).length;
        return { documentId, score: terms.length === 0 ? 0 : matched / terms.length };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    return Promise.resolve(scored);
  }
}
