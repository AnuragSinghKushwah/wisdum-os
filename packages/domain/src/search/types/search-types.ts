/**
 * Literal vocabularies of the Search bounded context. Value objects wrap
 * and validate these; the raw values appear in event payloads.
 */

export const SEARCH_INDEX_STATUSES = ['active', 'rebuilding', 'deleted'] as const;
export type SearchIndexStatusValue = (typeof SEARCH_INDEX_STATUSES)[number];

/** How a query is executed: lexical, vector, or a fusion of both. */
export const SEARCH_MODES = ['keyword', 'semantic', 'hybrid'] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/** Where an indexed document came from. */
export const SEARCH_SOURCE_TYPES = ['knowledge', 'document', 'conversation'] as const;
export type SearchSourceType = (typeof SEARCH_SOURCE_TYPES)[number];

/** Indexing state of one document inside an index. */
export const SEARCH_DOCUMENT_STATES = ['pending', 'indexed', 'failed'] as const;
export type SearchDocumentState = (typeof SEARCH_DOCUMENT_STATES)[number];

/** Filter values accepted by search queries. */
export type SearchFilterValue = string | number | boolean | readonly string[];
