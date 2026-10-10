import type { TenantId } from '@wisdum/types';
import type { DocumentDto } from '../dto/document-dto.js';

/** Read-side port for Document queries, separate from the write-side repository. */
export interface DocumentReadModel {
  /** Resolves to `undefined` for a resource that does not exist *in this tenant*. */
  findById(tenantId: TenantId, documentId: string): Promise<DocumentDto | undefined>;
}
