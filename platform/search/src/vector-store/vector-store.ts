export interface VectorRecord {
  readonly id: string;
  readonly vector: readonly number[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface VectorSearchHit {
  readonly id: string;
  readonly score: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Stores and queries embedding vectors behind a vendor-neutral contract.
 * Concrete stores (pgvector, a managed vector database) integrate as
 * plugins behind this interface.
 */
export interface VectorStore {
  upsert(indexName: string, records: readonly VectorRecord[]): Promise<void>;
  delete(indexName: string, ids: readonly string[]): Promise<void>;
  /** Nearest neighbors by cosine similarity, highest score first. */
  query(
    indexName: string,
    vector: readonly number[],
    limit: number,
  ): Promise<readonly VectorSearchHit[]>;
}
