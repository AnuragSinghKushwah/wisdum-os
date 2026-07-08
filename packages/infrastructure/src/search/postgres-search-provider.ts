import type { PgPool } from '@wisdum/database';
import type { SearchProvider } from './search-provider.js';

interface SearchHitRow {
  readonly document_id: string;
  readonly score: number;
}

/**
 * PostgreSQL full-text search: documents are upserted into
 * `search_provider_documents`, whose generated `tsvector` column and GIN
 * index back the actual matching. `ts_rank` is clamped to `[0, 1]` because
 * `SearchResult` (the domain VO downstream of this provider) requires a
 * normalized score, while `ts_rank` itself is not bounded to that range.
 */
export class PostgresSearchProvider implements SearchProvider {
  constructor(private readonly pool: PgPool) {}

  async index(indexName: string, documentId: string, text: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO search_provider_documents (index_name, document_id, content, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (index_name, document_id)
       DO UPDATE SET content = EXCLUDED.content, updated_at = now()`,
      [indexName, documentId, text],
    );
  }

  async remove(indexName: string, documentId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM search_provider_documents WHERE index_name = $1 AND document_id = $2',
      [indexName, documentId],
    );
  }

  async query(
    indexName: string,
    text: string,
    limit: number,
    offset: number,
  ): Promise<readonly { documentId: string; score: number }[]> {
    const result = await this.pool.query<SearchHitRow>(
      `SELECT document_id,
              LEAST(ts_rank(search_vector, websearch_to_tsquery('english', $2)), 1.0)::float8 AS score
       FROM search_provider_documents
       WHERE index_name = $1
         AND search_vector @@ websearch_to_tsquery('english', $2)
       ORDER BY score DESC
       LIMIT $3 OFFSET $4`,
      [indexName, text, limit, offset],
    );
    return result.rows.map((row) => ({ documentId: row.document_id, score: row.score }));
  }
}
