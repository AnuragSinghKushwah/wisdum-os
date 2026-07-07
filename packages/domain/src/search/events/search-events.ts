import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type { SearchMode, SearchSourceType } from '../types/search-types.js';

/**
 * Domain events of the Search bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const SEARCH_EVENT_SCHEMA_VERSION = 1;

export const SEARCH_INDEX_CREATED = 'search.index.created';
export const SEARCH_INDEX_REBUILD_STARTED = 'search.index.rebuild-started';
export const SEARCH_INDEX_REBUILD_COMPLETED = 'search.index.rebuild-completed';
export const SEARCH_INDEX_RANKING_CHANGED = 'search.index.ranking-changed';
export const SEARCH_INDEX_DELETED = 'search.index.deleted';
export const SEARCH_DOCUMENT_INDEXED = 'search.document.indexed';
export const SEARCH_DOCUMENT_REMOVED = 'search.document.removed';
export const SEARCH_DOCUMENT_FAILED = 'search.document.failed';

type SearchEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface SearchIndexCreatedPayload {
  readonly searchIndexId: UUID;
  readonly name: string;
  readonly mode: SearchMode;
}
export type SearchIndexCreated = SearchEvent<
  typeof SEARCH_INDEX_CREATED,
  SearchIndexCreatedPayload
>;

export interface SearchIndexRebuildStartedPayload {
  readonly searchIndexId: UUID;
}
export type SearchIndexRebuildStarted = SearchEvent<
  typeof SEARCH_INDEX_REBUILD_STARTED,
  SearchIndexRebuildStartedPayload
>;

export interface SearchIndexRebuildCompletedPayload {
  readonly searchIndexId: UUID;
  readonly documentCount: number;
}
export type SearchIndexRebuildCompleted = SearchEvent<
  typeof SEARCH_INDEX_REBUILD_COMPLETED,
  SearchIndexRebuildCompletedPayload
>;

export interface SearchIndexRankingChangedPayload {
  readonly searchIndexId: UUID;
  readonly keywordWeight: number;
  readonly semanticWeight: number;
  readonly recencyWeight: number;
}
export type SearchIndexRankingChanged = SearchEvent<
  typeof SEARCH_INDEX_RANKING_CHANGED,
  SearchIndexRankingChangedPayload
>;

export interface SearchIndexDeletedPayload {
  readonly searchIndexId: UUID;
}
export type SearchIndexDeleted = SearchEvent<
  typeof SEARCH_INDEX_DELETED,
  SearchIndexDeletedPayload
>;

export interface SearchDocumentIndexedPayload {
  readonly searchIndexId: UUID;
  readonly sourceId: UUID;
  readonly sourceType: SearchSourceType;
  readonly chunkCount: number;
}
export type SearchDocumentIndexed = SearchEvent<
  typeof SEARCH_DOCUMENT_INDEXED,
  SearchDocumentIndexedPayload
>;

export interface SearchDocumentRemovedPayload {
  readonly searchIndexId: UUID;
  readonly sourceId: UUID;
}
export type SearchDocumentRemoved = SearchEvent<
  typeof SEARCH_DOCUMENT_REMOVED,
  SearchDocumentRemovedPayload
>;

export interface SearchDocumentFailedPayload {
  readonly searchIndexId: UUID;
  readonly sourceId: UUID;
  readonly sourceType: SearchSourceType;
}
export type SearchDocumentFailed = SearchEvent<
  typeof SEARCH_DOCUMENT_FAILED,
  SearchDocumentFailedPayload
>;

export type AnySearchEvent =
  | SearchIndexCreated
  | SearchIndexRebuildStarted
  | SearchIndexRebuildCompleted
  | SearchIndexRankingChanged
  | SearchIndexDeleted
  | SearchDocumentIndexed
  | SearchDocumentRemoved
  | SearchDocumentFailed;
