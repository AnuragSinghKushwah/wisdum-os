import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { Document } from '../entities/document.js';
import type { ContentHash } from '../value-objects/content-hash.js';
import type { DocumentId } from '../value-objects/document-id.js';

/**
 * Persistence port of the Document aggregate. Interface only — the
 * implementation lives outside the domain (ADR 0007). Content-hash lookup
 * enables tenant-scoped deduplication before storing duplicate bytes.
 */
export interface DocumentRepository extends Repository<Document> {
  findById(id: DocumentId): Promise<Option<Document>>;
  findByContentHash(tenantId: TenantId, hash: ContentHash): Promise<Option<Document>>;
  exists(id: DocumentId): Promise<boolean>;
  save(document: Document): Promise<void>;
  delete(document: Document): Promise<void>;
}
