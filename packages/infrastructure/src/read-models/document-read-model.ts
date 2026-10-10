import type { TenantId } from '@wisdum/types';
import { DocumentId } from '@wisdum/domain';
import type { DocumentDto, DocumentReadModel } from '@wisdum/application';
import { toDocumentDto } from '@wisdum/application';
import type { InMemoryDocumentRepository } from '../persistence/document-repository.js';

export class InMemoryDocumentReadModel implements DocumentReadModel {
  constructor(private readonly repository: InMemoryDocumentRepository) {}

  async findById(tenantId: TenantId, documentId: string): Promise<DocumentDto | undefined> {
    const found = await this.repository.findById(DocumentId.create(documentId));
    return found.some && found.value.tenantId === tenantId ? toDocumentDto(found.value) : undefined;
  }
}
