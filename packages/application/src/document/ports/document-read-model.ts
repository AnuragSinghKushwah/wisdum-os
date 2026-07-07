import type { DocumentDto } from '../dto/document-dto.js';

/** Read-side port for Document queries, separate from the write-side repository. */
export interface DocumentReadModel {
  findById(documentId: string): Promise<DocumentDto | undefined>;
}
