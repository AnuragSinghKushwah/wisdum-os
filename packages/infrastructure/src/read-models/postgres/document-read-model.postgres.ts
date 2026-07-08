import { DocumentId } from '@wisdum/domain';
import type { DocumentDto, DocumentReadModel } from '@wisdum/application';
import { toDocumentDto } from '@wisdum/application';
import type { PostgresDocumentRepository } from '../../persistence/postgres/document-repository.postgres.js';

export class PostgresDocumentReadModel implements DocumentReadModel {
  constructor(private readonly repository: PostgresDocumentRepository) {}

  async findById(documentId: string): Promise<DocumentDto | undefined> {
    const found = await this.repository.findById(DocumentId.create(documentId));
    return found.some ? toDocumentDto(found.value) : undefined;
  }
}
