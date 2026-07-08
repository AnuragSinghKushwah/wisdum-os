import {
  ContentBody,
  ContentTitle,
  PublishedContent,
  PublishedContentId,
  PublishedSlug,
  type PublishedContentRepository,
} from '@wisdum/domain';
import type { PublishedContentSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { PublishedContentRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: PublishedContentRow): PublishedContentSnapshot {
  return {
    id: PublishedContentId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    draftId: row.draft_id,
    opportunityId: row.opportunity_id,
    slug: PublishedSlug.create(row.slug),
    title: ContentTitle.create(row.title),
    body: ContentBody.create(row.body),
    viewCount: row.view_count,
    publishedAt: row.published_at,
  };
}

/** PostgreSQL-backed `PublishedContentRepository`. Row shape mirrors migration 0024. */
export class PostgresPublishedContentRepository implements PublishedContentRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: PublishedContentId): Promise<Option<PublishedContent>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findBySlug(tenantId: TenantId, slug: PublishedSlug): Promise<Option<PublishedContent>> {
    return this.findOneWhere('tenant_id = $1 AND slug = $2', [tenantId, slug.value]);
  }

  async findByDraftId(tenantId: TenantId, draftId: string): Promise<Option<PublishedContent>> {
    return this.findOneWhere('tenant_id = $1 AND draft_id = $2', [tenantId, draftId]);
  }

  async save(published: PublishedContent): Promise<void> {
    await this.pool.query(
      `INSERT INTO published_content (
         id, tenant_id, draft_id, opportunity_id, slug, title, body, view_count, published_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         view_count = EXCLUDED.view_count`,
      [
        published.getId().value(),
        published.tenantId,
        published.draftId,
        published.opportunityId,
        published.slug.value,
        published.title.value,
        published.body.value,
        published.viewCount,
        published.publishedAt,
      ],
    );
  }

  async delete(published: PublishedContent): Promise<void> {
    await this.pool.query('DELETE FROM published_content WHERE id = $1', [
      published.getId().value(),
    ]);
  }

  private async findOneWhere(
    clause: string,
    params: unknown[],
  ): Promise<Option<PublishedContent>> {
    const result = await this.pool.query<PublishedContentRow>(
      `SELECT * FROM published_content WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(PublishedContent.reconstitute(toSnapshot(row)));
  }
}
