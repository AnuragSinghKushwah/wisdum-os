import { randomUUID } from 'node:crypto';
import type { PgPool } from '@wisdum/database';
import {
  ContentReference,
  Knowledge,
  KnowledgeDescription,
  KnowledgeId,
  type KnowledgeRepository,
  KnowledgeSlug,
  KnowledgeSource,
  KnowledgeStatus,
  KnowledgeTitle,
  KnowledgeType,
  KnowledgeVersion,
  KnowledgeVisibility,
  KnowledgeLabel,
} from '@wisdum/domain';
import type { KnowledgeProperties, KnowledgeSnapshot } from '@wisdum/domain';
import type {
  KnowledgeContentReferenceRow,
  KnowledgeLabelRow,
  KnowledgeRow,
} from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(
  row: KnowledgeRow,
  labels: readonly KnowledgeLabelRow[],
  contentReferences: readonly KnowledgeContentReferenceRow[],
): KnowledgeSnapshot {
  return {
    id: KnowledgeId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    title: KnowledgeTitle.create(row.title),
    slug: KnowledgeSlug.create(row.slug),
    description: KnowledgeDescription.create(row.description),
    type: KnowledgeType.create(row.type),
    status: KnowledgeStatus.create(row.status),
    visibility: KnowledgeVisibility.create(row.visibility),
    source: KnowledgeSource.create({ kind: row.source_kind, uri: row.source_uri }),
    version: KnowledgeVersion.create(row.version),
    labels: labels.map((label) => KnowledgeLabel.create(label.label)),
    properties: row.properties as KnowledgeProperties,
    contentReferences: [...contentReferences]
      .sort((a, b) => a.position - b.position)
      .map((reference) =>
        ContentReference.create({ reference: reference.reference, mimeType: reference.mime_type }),
      ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processingStartedAt: row.processing_started_at,
    processedAt: row.processed_at,
  };
}

/** PostgreSQL-backed `KnowledgeRepository`. Row shapes mirror migration 0005. */
export class PostgresKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: KnowledgeId): Promise<Option<Knowledge>> {
    const rowResult = await this.pool.query<KnowledgeRow>(
      'SELECT * FROM knowledge WHERE id = $1',
      [id.value()],
    );
    const row = rowResult.rows[0];
    if (row === undefined) return none;
    return some(await this.hydrate(row));
  }

  async findBySlug(tenantId: TenantId, slug: KnowledgeSlug): Promise<Option<Knowledge>> {
    const rowResult = await this.pool.query<KnowledgeRow>(
      'SELECT * FROM knowledge WHERE tenant_id = $1 AND slug = $2',
      [tenantId, slug.value],
    );
    const row = rowResult.rows[0];
    if (row === undefined) return none;
    return some(await this.hydrate(row));
  }

  async exists(id: KnowledgeId): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM knowledge WHERE id = $1', [id.value()]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async save(knowledge: Knowledge): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO knowledge (
           id, tenant_id, title, slug, description, type, status, visibility,
           source_kind, source_uri, version, properties, created_at, updated_at,
           processing_started_at, processed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           slug = EXCLUDED.slug,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           visibility = EXCLUDED.visibility,
           version = EXCLUDED.version,
           properties = EXCLUDED.properties,
           updated_at = EXCLUDED.updated_at,
           processing_started_at = EXCLUDED.processing_started_at,
           processed_at = EXCLUDED.processed_at`,
        [
          knowledge.getId().value(),
          knowledge.tenantId,
          knowledge.title.value,
          knowledge.slug.value,
          knowledge.description.value,
          knowledge.type.value,
          knowledge.status.value,
          knowledge.visibility.value,
          knowledge.source.kind,
          knowledge.source.uri,
          knowledge.version.value,
          JSON.stringify(knowledge.properties),
          knowledge.createdAt,
          knowledge.updatedAt,
          knowledge.processingStartedAt,
          knowledge.processedAt,
        ],
      );

      await client.query('DELETE FROM knowledge_labels WHERE knowledge_id = $1', [
        knowledge.getId().value(),
      ]);
      for (const label of knowledge.labels) {
        await client.query(
          'INSERT INTO knowledge_labels (knowledge_id, label) VALUES ($1, $2)',
          [knowledge.getId().value(), label.value],
        );
      }

      await client.query(
        'DELETE FROM knowledge_content_references WHERE knowledge_id = $1',
        [knowledge.getId().value()],
      );
      for (const [position, reference] of knowledge.contentReferences.entries()) {
        await client.query(
          `INSERT INTO knowledge_content_references (id, knowledge_id, reference, mime_type, position)
           VALUES ($1, $2, $3, $4, $5)`,
          [randomUUID(), knowledge.getId().value(), reference.reference, reference.mimeType, position],
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

  async delete(knowledge: Knowledge): Promise<void> {
    await this.pool.query('DELETE FROM knowledge WHERE id = $1', [knowledge.getId().value()]);
  }

  private async hydrate(row: KnowledgeRow): Promise<Knowledge> {
    const [labels, contentReferences] = await Promise.all([
      this.pool.query<KnowledgeLabelRow>(
        'SELECT * FROM knowledge_labels WHERE knowledge_id = $1',
        [row.id],
      ),
      this.pool.query<KnowledgeContentReferenceRow>(
        'SELECT * FROM knowledge_content_references WHERE knowledge_id = $1',
        [row.id],
      ),
    ]);
    return Knowledge.reconstitute(toSnapshot(row, labels.rows, contentReferences.rows));
  }
}
