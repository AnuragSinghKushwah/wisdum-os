import type { IsoTimestamp, UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { SEARCH_DOCUMENT_STATES, SEARCH_SOURCE_TYPES } from '../types/search-types.js';
import type { SearchDocumentState, SearchSourceType } from '../types/search-types.js';

/**
 * The indexing record of one source inside a search index: what was
 * indexed, from where, in what state. The indexed content itself lives in
 * the search engine; the domain tracks membership and freshness.
 */
export class SearchDocument extends ValueObject<SearchDocument> {
  private constructor(
    private readonly _sourceId: UUID,
    private readonly _sourceType: SearchSourceType,
    private readonly _state: SearchDocumentState,
    private readonly _indexedAt: IsoTimestamp,
    private readonly _chunkCount: number,
  ) {
    super();
  }

  static create(props: {
    sourceId: UUID;
    sourceType: SearchSourceType;
    state?: SearchDocumentState;
    indexedAt: IsoTimestamp;
    chunkCount?: number;
  }): SearchDocument {
    if (!(SEARCH_SOURCE_TYPES as readonly string[]).includes(props.sourceType)) {
      throw new ValidationError(`Unknown search source type: ${props.sourceType}`, {
        sourceType: props.sourceType,
        allowed: [...SEARCH_SOURCE_TYPES],
      });
    }
    const state = props.state ?? 'pending';
    if (!(SEARCH_DOCUMENT_STATES as readonly string[]).includes(state)) {
      throw new ValidationError(`Unknown search document state: ${state}`, {
        state,
        allowed: [...SEARCH_DOCUMENT_STATES],
      });
    }
    const chunkCount = props.chunkCount ?? 0;
    if (!Number.isInteger(chunkCount) || chunkCount < 0) {
      throw new ValidationError('Chunk count must be a non-negative integer', { chunkCount });
    }
    return new SearchDocument(props.sourceId, props.sourceType, state, props.indexedAt, chunkCount);
  }

  get sourceId(): UUID {
    return this._sourceId;
  }

  get sourceType(): SearchSourceType {
    return this._sourceType;
  }

  get state(): SearchDocumentState {
    return this._state;
  }

  get indexedAt(): IsoTimestamp {
    return this._indexedAt;
  }

  get chunkCount(): number {
    return this._chunkCount;
  }

  /** New value marking a successful indexing pass. */
  indexed(at: IsoTimestamp, chunkCount: number): SearchDocument {
    return SearchDocument.create({
      sourceId: this._sourceId,
      sourceType: this._sourceType,
      state: 'indexed',
      indexedAt: at,
      chunkCount,
    });
  }

  /** New value marking a failed indexing pass. */
  failed(at: IsoTimestamp): SearchDocument {
    return SearchDocument.create({
      sourceId: this._sourceId,
      sourceType: this._sourceType,
      state: 'failed',
      indexedAt: at,
      chunkCount: 0,
    });
  }

  equals(other: unknown): boolean {
    return (
      other instanceof SearchDocument &&
      other._sourceId === this._sourceId &&
      other._sourceType === this._sourceType &&
      other._state === this._state &&
      other._indexedAt === this._indexedAt &&
      other._chunkCount === this._chunkCount
    );
  }

  toString(): string {
    return `${this._sourceType}:${this._sourceId}(${this._state})`;
  }
}
