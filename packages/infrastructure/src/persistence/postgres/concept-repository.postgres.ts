import {
  Concept,
  ConceptDescription,
  ConceptId,
  ConceptName,
  type ConceptRepository,
} from '@wisdum/domain';
import type { ConceptSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { ConceptRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: ConceptRow): ConceptSnapshot {
  return {
    id: ConceptId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    name: ConceptName.create(row.name),
    description: ConceptDescription.create(row.description),
    mentionCount: row.mention_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `ConceptRepository`. Row shape mirrors migration 0018. */
export class PostgresConceptRepository implements ConceptRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: ConceptId): Promise<Option<Concept>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByName(tenantId: TenantId, name: ConceptName): Promise<Option<Concept>> {
    return this.findOneWhere('tenant_id = $1 AND normalized_name = $2', [
      tenantId,
      name.normalized,
    ]);
  }

  async listByTenant(tenantId: TenantId): Promise<readonly Concept[]> {
    const result = await this.pool.query<ConceptRow>(
      'SELECT * FROM concepts WHERE tenant_id = $1 ORDER BY mention_count DESC',
      [tenantId],
    );
    return result.rows.map((row) => Concept.reconstitute(toSnapshot(row)));
  }

  async save(concept: Concept): Promise<void> {
    await this.pool.query(
      `INSERT INTO concepts (
         id, tenant_id, name, normalized_name, description, mention_count, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         normalized_name = EXCLUDED.normalized_name,
         description = EXCLUDED.description,
         mention_count = EXCLUDED.mention_count,
         updated_at = EXCLUDED.updated_at`,
      [
        concept.getId().value(),
        concept.tenantId,
        concept.name.value,
        concept.name.normalized,
        concept.description.value,
        concept.mentionCount,
        concept.createdAt,
        concept.updatedAt,
      ],
    );
  }

  async delete(concept: Concept): Promise<void> {
    await this.pool.query('DELETE FROM concepts WHERE id = $1', [concept.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<Concept>> {
    const result = await this.pool.query<ConceptRow>(
      `SELECT * FROM concepts WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(Concept.reconstitute(toSnapshot(row)));
  }
}
