import { ValidationError } from '@wisdum/errors';
import type { VectorRecord, VectorSearchHit, VectorStore } from './vector-store.js';

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new ValidationError('Vectors must share the same dimensionality', {
      lengthA: a.length,
      lengthB: b.length,
    });
  }
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    magnitudeA += (a[i] ?? 0) ** 2;
    magnitudeB += (b[i] ?? 0) ** 2;
  }
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/** In-memory, brute-force vector store for development and tests. */
export class InMemoryVectorStore implements VectorStore {
  private readonly indexes = new Map<string, Map<string, VectorRecord>>();

  upsert(indexName: string, records: readonly VectorRecord[]): Promise<void> {
    const index = this.indexes.get(indexName) ?? new Map<string, VectorRecord>();
    for (const record of records) index.set(record.id, record);
    this.indexes.set(indexName, index);
    return Promise.resolve();
  }

  delete(indexName: string, ids: readonly string[]): Promise<void> {
    const index = this.indexes.get(indexName);
    if (index === undefined) return Promise.resolve();
    for (const id of ids) index.delete(id);
    return Promise.resolve();
  }

  query(
    indexName: string,
    vector: readonly number[],
    limit: number,
  ): Promise<readonly VectorSearchHit[]> {
    const index = this.indexes.get(indexName);
    if (index === undefined) return Promise.resolve([]);

    const hits = [...index.values()]
      .map((record) => ({
        id: record.id,
        score: cosineSimilarity(vector, record.vector),
        metadata: record.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return Promise.resolve(hits);
  }
}
