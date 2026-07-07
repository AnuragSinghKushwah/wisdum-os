/**
 * Literal vocabularies of the Document bounded context. Value objects wrap
 * and validate these; the raw values appear in event payloads.
 */

export const CONTENT_ENCODINGS = ['utf-8', 'utf-16le', 'ascii', 'latin1', 'base64'] as const;
export type ContentEncodingValue = (typeof CONTENT_ENCODINGS)[number];

export const HASH_ALGORITHMS = ['sha-256', 'sha-512', 'blake3'] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

export const DOCUMENT_STATUSES = ['active', 'superseded', 'deleted'] as const;
export type DocumentStatusValue = (typeof DOCUMENT_STATUSES)[number];
