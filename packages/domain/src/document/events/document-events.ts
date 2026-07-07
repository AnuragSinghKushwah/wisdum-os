import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type { ContentEncodingValue, DocumentStatusValue } from '../types/document-types.js';

/**
 * Domain events of the Document bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const DOCUMENT_EVENT_SCHEMA_VERSION = 1;

export const DOCUMENT_CREATED = 'document.content.created';
export const DOCUMENT_CONTENT_REPLACED = 'document.content.replaced';
export const DOCUMENT_LANGUAGE_DETECTED = 'document.content.language-detected';
export const DOCUMENT_SUPERSEDED = 'document.content.superseded';
export const DOCUMENT_DELETED = 'document.content.deleted';

type DocumentEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface DocumentCreatedPayload {
  readonly documentId: UUID;
  readonly mimeType: string;
  readonly language: string;
  readonly encoding: ContentEncodingValue;
  readonly sizeBytes: number;
  readonly contentHash: string;
}
export type DocumentCreated = DocumentEvent<typeof DOCUMENT_CREATED, DocumentCreatedPayload>;

export interface DocumentContentReplacedPayload {
  readonly documentId: UUID;
  readonly previousHash: string;
  readonly contentHash: string;
  readonly sizeBytes: number;
  readonly encoding: ContentEncodingValue;
}
export type DocumentContentReplaced = DocumentEvent<
  typeof DOCUMENT_CONTENT_REPLACED,
  DocumentContentReplacedPayload
>;

export interface DocumentLanguageDetectedPayload {
  readonly documentId: UUID;
  readonly from: string;
  readonly to: string;
}
export type DocumentLanguageDetected = DocumentEvent<
  typeof DOCUMENT_LANGUAGE_DETECTED,
  DocumentLanguageDetectedPayload
>;

export interface DocumentSupersededPayload {
  readonly documentId: UUID;
  readonly supersededBy: UUID;
}
export type DocumentSuperseded = DocumentEvent<
  typeof DOCUMENT_SUPERSEDED,
  DocumentSupersededPayload
>;

export interface DocumentDeletedPayload {
  readonly documentId: UUID;
  readonly previousStatus: DocumentStatusValue;
}
export type DocumentDeleted = DocumentEvent<typeof DOCUMENT_DELETED, DocumentDeletedPayload>;

export type AnyDocumentEvent =
  | DocumentCreated
  | DocumentContentReplaced
  | DocumentLanguageDetected
  | DocumentSuperseded
  | DocumentDeleted;
