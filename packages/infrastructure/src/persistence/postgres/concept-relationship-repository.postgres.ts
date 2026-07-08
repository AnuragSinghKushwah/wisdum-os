import {
  ConceptId,
  ConceptRelationship,
  ConceptRelationshipId,
  ConceptRelationshipType,
  type ConceptRelationshipRepository,
} from '@wisdum/domain';
import type { ConceptRelationshipSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { ConceptRelationshipRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: ConceptRelationshipRow): ConceptRelationshipSnapshot {
  return {
    id: ConceptRelationshipId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    conceptAId: ConceptId.create(row.concept_a_id),
    conceptBId: ConceptId.create(row.concept_b_id),
    relationshipType: ConceptRelationshipType.create(row.relationship_type),
    occurrenceCount: row.occurrence_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `ConceptRelationshipRepository`. Row shape mirrors migration 0020. */
export class PostgresConceptRelationshipRepository implements ConceptRelationshipRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: ConceptRelationshipId): Promise<Option<ConceptRelationship>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findExisting(
    tenantId: TenantId,
    conceptAId: ConceptId,
    conceptBId: ConceptId,
    relationshipType: ConceptRelationshipType,
  ): Promise<Option<ConceptRelationship>> {
    return this.findOneWhere(
      'tenant_id = $1 AND concept_a_id = $2 AND concept_b_id = $3 AND relationship_type = $4',
      [tenantId, conceptAId.value(), conceptBId.value(), relationshipType.value],
    );
  }

  async listByTenant(tenantId: TenantId): Promise<readonly ConceptRelationship[]> {
    const result = await this.pool.query<ConceptRelationshipRow>(
      'SELECT * FROM concept_relationships WHERE tenant_id = $1 ORDER BY occurrence_count DESC',
      [tenantId],
    );
    return result.rows.map((row) => ConceptRelationship.reconstitute(toSnapshot(row)));
  }

  async save(relationship: ConceptRelationship): Promise<void> {
    await this.pool.query(
      `INSERT INTO concept_relationships (
         id, tenant_id, concept_a_id, concept_b_id, relationship_type,
         occurrence_count, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         occurrence_count = EXCLUDED.occurrence_count,
         updated_at = EXCLUDED.updated_at`,
      [
        relationship.getId().value(),
        relationship.tenantId,
        relationship.conceptAId.value(),
        relationship.conceptBId.value(),
        relationship.relationshipType.value,
        relationship.occurrenceCount,
        relationship.createdAt,
        relationship.updatedAt,
      ],
    );
  }

  async delete(relationship: ConceptRelationship): Promise<void> {
    await this.pool.query('DELETE FROM concept_relationships WHERE id = $1', [
      relationship.getId().value(),
    ]);
  }

  private async findOneWhere(
    clause: string,
    params: unknown[],
  ): Promise<Option<ConceptRelationship>> {
    const result = await this.pool.query<ConceptRelationshipRow>(
      `SELECT * FROM concept_relationships WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(ConceptRelationship.reconstitute(toSnapshot(row)));
  }
}
