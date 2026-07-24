import {
  ContentBody,
  ContentDraft,
  ContentDraftId,
  ContentDraftStatus,
  ContentTitle,
  type ContentDraftRepository,
} from '@wisdum/domain';
import type { ContentDraftSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { ContentDraftRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: ContentDraftRow): ContentDraftSnapshot {
  return {
    id: ContentDraftId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    opportunityId: row.opportunity_id,
    title: ContentTitle.create(row.title),
    body: ContentBody.create(row.body),
    status: ContentDraftStatus.create(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `ContentDraftRepository`. Row shape mirrors migration 0023. */
export class PostgresContentDraftRepository implements ContentDraftRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: ContentDraftId): Promise<Option<ContentDraft>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByOpportunityId(
    tenantId: TenantId,
    opportunityId: string,
  ): Promise<Option<ContentDraft>> {
    return this.findOneWhere('tenant_id = $1 AND opportunity_id = $2', [tenantId, opportunityId]);
  }

  async save(draft: ContentDraft): Promise<void> {
    await this.pool.query(
      `INSERT INTO content_drafts (
         id, tenant_id, opportunity_id, title, body, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [
        draft.getId().value(),
        draft.tenantId,
        draft.opportunityId,
        draft.title.value,
        draft.body.value,
        draft.status.value,
        draft.createdAt,
        draft.updatedAt,
      ],
    );
  }

  async delete(draft: ContentDraft): Promise<void> {
    await this.pool.query('DELETE FROM content_drafts WHERE id = $1', [draft.getId().value()]);
  }

  async listByTenant(tenantId: TenantId): Promise<readonly ContentDraft[]> {
    const result = await this.pool.query<ContentDraftRow>(
      'SELECT * FROM content_drafts WHERE tenant_id = $1 ORDER BY updated_at DESC',
      [tenantId],
    );
    return result.rows.map((row) => ContentDraft.reconstitute(toSnapshot(row)));
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<ContentDraft>> {
    const result = await this.pool.query<ContentDraftRow>(
      `SELECT * FROM content_drafts WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(ContentDraft.reconstitute(toSnapshot(row)));
  }
}
