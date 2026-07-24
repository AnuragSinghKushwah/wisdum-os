import type { VectorRecord, VectorSearchHit, VectorStore } from '@wisdum/platform-search';
import type { PgPool } from '@wisdum/database';

interface VectorRecordRow {
  readonly id: string;
  readonly metadata: Record<string, unknown>;
  readonly score: string;
}

/** Renders a vector as a pgvector literal (`pg` has no native vector type). */
function toVectorLiteral(vector: readonly number[]): string {
  return `[${vector.join(',')}]`;
}

/**
 * PostgreSQL/pgvector-backed `VectorStore`. Row shape mirrors migration 0026.
 * No ANN index (ivfflat/hnsw) yet — the `embedding` column has no fixed
 * dimension since exactly one embedding provider is active per deployment,
 * and those indexes require committing to one. Cosine similarity is a
 * brute-force scan, which is fine at this scale.
 */
export class PostgresVectorStore implements VectorStore {
  constructor(private readonly pool: PgPool) {}

  async upsert(indexName: string, records: readonly VectorRecord[]): Promise<void> {
    for (const record of records) {
      await this.pool.query(
        `INSERT INTO vector_records (index_name, id, embedding, metadata)
         VALUES ($1, $2, $3::vector, $4)
         ON CONFLICT (index_name, id) DO UPDATE SET
           embedding = EXCLUDED.embedding,
           metadata = EXCLUDED.metadata`,
        [indexName, record.id, toVectorLiteral(record.vector), record.metadata ?? {}],
      );
    }
  }

  async delete(indexName: string, ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query('DELETE FROM vector_records WHERE index_name = $1 AND id = ANY($2)', [
      indexName,
      ids,
    ]);
  }

  async query(
    indexName: string,
    vector: readonly number[],
    limit: number,
  ): Promise<readonly VectorSearchHit[]> {
    const result = await this.pool.query<VectorRecordRow>(
      `SELECT id, metadata, 1 - (embedding <=> $1::vector) AS score
       FROM vector_records
       WHERE index_name = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [toVectorLiteral(vector), indexName, limit],
    );
    return result.rows.map((row) => ({
      id: row.id,
      score: Number(row.score),
      metadata: row.metadata,
    }));
  }
}
