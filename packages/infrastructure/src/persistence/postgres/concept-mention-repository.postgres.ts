import {
  ConceptId,
  ConceptMention,
  ConceptMentionId,
  type ConceptMentionRepository,
} from '@wisdum/domain';
import type { ConceptMentionSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { ConceptMentionRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: ConceptMentionRow): ConceptMentionSnapshot {
  return {
    id: ConceptMentionId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    conceptId: ConceptId.create(row.concept_id),
    knowledgeId: row.knowledge_id,
    createdAt: row.created_at,
  };
}

/** PostgreSQL-backed `ConceptMentionRepository`. Row shape mirrors migration 0019. */
export class PostgresConceptMentionRepository implements ConceptMentionRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: ConceptMentionId): Promise<Option<ConceptMention>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findExisting(
    tenantId: TenantId,
    conceptId: ConceptId,
    knowledgeId: string,
  ): Promise<Option<ConceptMention>> {
    return this.findOneWhere('tenant_id = $1 AND concept_id = $2 AND knowledge_id = $3', [
      tenantId,
      conceptId.value(),
      knowledgeId,
    ]);
  }

  async listByConcept(tenantId: TenantId, conceptId: ConceptId): Promise<readonly ConceptMention[]> {
    const result = await this.pool.query<ConceptMentionRow>(
      'SELECT * FROM concept_mentions WHERE tenant_id = $1 AND concept_id = $2',
      [tenantId, conceptId.value()],
    );
    return result.rows.map((row) => ConceptMention.reconstitute(toSnapshot(row)));
  }

  async save(mention: ConceptMention): Promise<void> {
    await this.pool.query(
      `INSERT INTO concept_mentions (id, tenant_id, concept_id, knowledge_id, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [
        mention.getId().value(),
        mention.tenantId,
        mention.conceptId.value(),
        mention.knowledgeId,
        mention.createdAt,
      ],
    );
  }

  async delete(mention: ConceptMention): Promise<void> {
    await this.pool.query('DELETE FROM concept_mentions WHERE id = $1', [mention.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<ConceptMention>> {
    const result = await this.pool.query<ConceptMentionRow>(
      `SELECT * FROM concept_mentions WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(ConceptMention.reconstitute(toSnapshot(row)));
  }
}
