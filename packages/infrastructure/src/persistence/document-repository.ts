import type { ContentHash, Document, DocumentId, DocumentRepository } from '@wisdum/domain';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryDocumentRepository
  extends InMemoryRepository<DocumentId, Document>
  implements DocumentRepository
{
  findByContentHash(tenantId: TenantId, hash: ContentHash): Promise<Option<Document>> {
    const found = this.values().find(
      (document) => document.tenantId === tenantId && document.contentHash.equals(hash),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }
}
