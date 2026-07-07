import type { Document } from '@wisdum/domain';

export interface DocumentDto {
  readonly id: string;
  readonly mimeType: string;
  readonly language: string;
  readonly encoding: string;
  readonly sizeBytes: number;
  readonly contentHash: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toDocumentDto(document: Document): DocumentDto {
  return {
    id: document.getId().value(),
    mimeType: document.mimeType.value,
    language: document.language.value,
    encoding: document.encoding.value,
    sizeBytes: document.sizeBytes.value,
    contentHash: document.contentHash.toString(),
    status: document.status.value,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
