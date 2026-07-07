import {
  SearchDocument,
  SearchIndex,
  SearchIndexId,
  type SearchIndexRepository,
  SearchRanking,
} from '@wisdum/domain';
import type { SearchDocumentState, SearchIndexSnapshot, SearchSourceType } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { SearchIndexDocumentRow, SearchIndexRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(
  row: SearchIndexRow,
  documents: readonly SearchIndexDocumentRow[],
): SearchIndexSnapshot {
  return {
    id: SearchIndexId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    name: row.name,
    mode: row.mode as SearchIndexSnapshot['mode'],
    ranking: SearchRanking.create({
      keywordWeight: Number(row.keyword_weight),
      semanticWeight: Number(row.semantic_weight),
      recencyWeight: Number(row.recency_weight),
    }),
    status: row.status as SearchIndexSnapshot['status'],
    documents: documents.map((document) =>
      SearchDocument.create({
        sourceId: document.source_id,
        sourceType: document.source_type as SearchSourceType,
        state: document.state as SearchDocumentState,
        indexedAt: document.indexed_at,
        chunkCount: document.chunk_count,
      }),
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `SearchIndexRepository`. Row shapes mirror migration 0010. */
export class PostgresSearchIndexRepository implements SearchIndexRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: SearchIndexId): Promise<Option<SearchIndex>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByName(tenantId: TenantId, name: string): Promise<Option<SearchIndex>> {
    return this.findOneWhere('tenant_id = $1 AND name = $2', [tenantId, name]);
  }

  async findAll(tenantId: TenantId): Promise<readonly SearchIndex[]> {
    const result = await this.pool.query<SearchIndexRow>(
      'SELECT * FROM search_indexes WHERE tenant_id = $1',
      [tenantId],
    );
    return Promise.all(result.rows.map((row) => this.hydrate(row)));
  }

  async save(index: SearchIndex): Promise<void> {
    const client = await this.pool.connect();
    const id = index.getId().value();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO search_indexes (
           id, tenant_id, name, mode, keyword_weight, semantic_weight, recency_weight,
           status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           mode = EXCLUDED.mode,
           keyword_weight = EXCLUDED.keyword_weight,
           semantic_weight = EXCLUDED.semantic_weight,
           recency_weight = EXCLUDED.recency_weight,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          index.tenantId,
          index.name,
          index.mode,
          index.ranking.keywordWeight,
          index.ranking.semanticWeight,
          index.ranking.recencyWeight,
          index.status,
          index.createdAt,
          index.updatedAt,
        ],
      );

      await client.query('DELETE FROM search_index_documents WHERE search_index_id = $1', [id]);
      for (const document of index.documents) {
        await client.query(
          `INSERT INTO search_index_documents (
             search_index_id, source_id, source_type, state, chunk_count, indexed_at
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, document.sourceId, document.sourceType, document.state, document.chunkCount, document.indexedAt],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(index: SearchIndex): Promise<void> {
    await this.pool.query('DELETE FROM search_indexes WHERE id = $1', [index.getId().value()]);
  }

  private async findOneWhere(
    clause: string,
    params: unknown[],
  ): Promise<Option<SearchIndex>> {
    const result = await this.pool.query<SearchIndexRow>(
      `SELECT * FROM search_indexes WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    if (row === undefined) return none;
    return some(await this.hydrate(row));
  }

  private async hydrate(row: SearchIndexRow): Promise<SearchIndex> {
    const documents = await this.pool.query<SearchIndexDocumentRow>(
      'SELECT * FROM search_index_documents WHERE search_index_id = $1',
      [row.id],
    );
    return SearchIndex.reconstitute(toSnapshot(row, documents.rows));
  }
}
