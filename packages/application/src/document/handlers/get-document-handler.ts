import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { DocumentDto } from '../dto/document-dto.js';
import type { DocumentReadModel } from '../ports/document-read-model.js';
import type { GetDocumentQuery } from '../queries/get-document-query.js';

export class GetDocumentHandler implements QueryHandler<GetDocumentQuery, DocumentDto> {
  constructor(private readonly reads: DocumentReadModel) {}

  async execute(query: GetDocumentQuery): Promise<DocumentDto> {
    const dto = await this.reads.findById(query.documentId);
    if (dto === undefined) {
      throw new NotFoundError('Document not found', { documentId: query.documentId });
    }
    return dto;
  }
}
