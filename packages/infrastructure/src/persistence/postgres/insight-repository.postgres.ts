import { Insight, InsightId, InsightSummary, type InsightRepository } from '@wisdum/domain';
import type { InsightSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { InsightRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: InsightRow): InsightSnapshot {
  return {
    id: InsightId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    summary: InsightSummary.create(row.summary),
    conceptIds: row.concept_ids,
    sourceKnowledgeIds: row.source_knowledge_ids,
    createdAt: row.created_at,
  };
}

/** PostgreSQL-backed `InsightRepository`. Row shape mirrors migration 0021. */
export class PostgresInsightRepository implements InsightRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: InsightId): Promise<Option<Insight>> {
    const result = await this.pool.query<InsightRow>('SELECT * FROM insights WHERE id = $1', [
      id.value(),
    ]);
    const row = result.rows[0];
    return row === undefined ? none : some(Insight.reconstitute(toSnapshot(row)));
  }

  async save(insight: Insight): Promise<void> {
    await this.pool.query(
      `INSERT INTO insights (id, tenant_id, summary, concept_ids, source_knowledge_ids, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        insight.getId().value(),
        insight.tenantId,
        insight.summary.value,
        insight.conceptIds,
        insight.sourceKnowledgeIds,
        insight.createdAt,
      ],
    );
  }

  async delete(insight: Insight): Promise<void> {
    await this.pool.query('DELETE FROM insights WHERE id = $1', [insight.getId().value()]);
  }
}
