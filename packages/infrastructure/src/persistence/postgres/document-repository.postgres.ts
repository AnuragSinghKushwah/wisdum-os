import {
  ContentEncoding,
  ContentHash,
  Document,
  DocumentContent,
  DocumentId,
  type DocumentRepository,
  DocumentStatus,
  ByteSize,
  LanguageCode,
  MimeType,
} from '@wisdum/domain';
import type { DocumentSnapshot, HashAlgorithm } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { DocumentRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: DocumentRow): DocumentSnapshot {
  return {
    id: DocumentId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    content: DocumentContent.create(row.content),
    mimeType: MimeType.create(row.mime_type),
    language: LanguageCode.create(row.language),
    encoding: ContentEncoding.create(row.encoding),
    sizeBytes: ByteSize.create(row.size_bytes),
    contentHash: ContentHash.create({
      algorithm: row.content_hash_algorithm as HashAlgorithm,
      digest: row.content_hash_digest,
    }),
    status: DocumentStatus.create(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `DocumentRepository`. Row shape mirrors migration 0006. */
export class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: DocumentId): Promise<Option<Document>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByContentHash(tenantId: TenantId, hash: ContentHash): Promise<Option<Document>> {
    return this.findOneWhere(
      'tenant_id = $1 AND content_hash_algorithm = $2 AND content_hash_digest = $3',
      [tenantId, hash.algorithm, hash.digest],
    );
  }

  async exists(id: DocumentId): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM documents WHERE id = $1', [id.value()]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async save(document: Document): Promise<void> {
    await this.pool.query(
      `INSERT INTO documents (
         id, tenant_id, content, mime_type, language, encoding, size_bytes,
         content_hash_algorithm, content_hash_digest, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         mime_type = EXCLUDED.mime_type,
         language = EXCLUDED.language,
         encoding = EXCLUDED.encoding,
         size_bytes = EXCLUDED.size_bytes,
         content_hash_algorithm = EXCLUDED.content_hash_algorithm,
         content_hash_digest = EXCLUDED.content_hash_digest,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [
        document.getId().value(),
        document.tenantId,
        document.content.value,
        document.mimeType.value,
        document.language.value,
        document.encoding.value,
        document.sizeBytes.value,
        document.contentHash.algorithm,
        document.contentHash.digest,
        document.status.value,
        document.createdAt,
        document.updatedAt,
      ],
    );
  }

  async delete(document: Document): Promise<void> {
    await this.pool.query('DELETE FROM documents WHERE id = $1', [document.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<Document>> {
    const result = await this.pool.query<DocumentRow>(
      `SELECT * FROM documents WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(Document.reconstitute(toSnapshot(row)));
  }
}
