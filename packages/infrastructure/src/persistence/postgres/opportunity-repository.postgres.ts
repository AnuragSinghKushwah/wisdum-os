import {
  Opportunity,
  OpportunityId,
  OpportunityRationale,
  OpportunityStatus,
  OpportunityTitle,
  OpportunityType,
  type OpportunityRepository,
} from '@wisdum/domain';
import type { OpportunitySnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { OpportunityRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: OpportunityRow): OpportunitySnapshot {
  return {
    id: OpportunityId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    insightId: row.insight_id,
    title: OpportunityTitle.create(row.title),
    rationale: OpportunityRationale.create(row.rationale),
    type: OpportunityType.create(row.type),
    status: OpportunityStatus.create(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `OpportunityRepository`. Row shape mirrors migration 0022. */
export class PostgresOpportunityRepository implements OpportunityRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: OpportunityId): Promise<Option<Opportunity>> {
    const result = await this.pool.query<OpportunityRow>(
      'SELECT * FROM opportunities WHERE id = $1',
      [id.value()],
    );
    const row = result.rows[0];
    return row === undefined ? none : some(Opportunity.reconstitute(toSnapshot(row)));
  }

  async listByTenant(tenantId: TenantId): Promise<readonly Opportunity[]> {
    const result = await this.pool.query<OpportunityRow>(
      'SELECT * FROM opportunities WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId],
    );
    return result.rows.map((row) => Opportunity.reconstitute(toSnapshot(row)));
  }

  async save(opportunity: Opportunity): Promise<void> {
    await this.pool.query(
      `INSERT INTO opportunities (
         id, tenant_id, insight_id, title, rationale, type, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [
        opportunity.getId().value(),
        opportunity.tenantId,
        opportunity.insightId,
        opportunity.title.value,
        opportunity.rationale.value,
        opportunity.type.value,
        opportunity.status.value,
        opportunity.createdAt,
        opportunity.updatedAt,
      ],
    );
  }

  async delete(opportunity: Opportunity): Promise<void> {
    await this.pool.query('DELETE FROM opportunities WHERE id = $1', [opportunity.getId().value()]);
  }
}
