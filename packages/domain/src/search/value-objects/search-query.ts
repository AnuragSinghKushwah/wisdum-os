import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { SEARCH_MODES } from '../types/search-types.js';
import type { SearchFilterValue, SearchMode } from '../types/search-types.js';

const MAX_QUERY_LENGTH = 1000;
const MAX_LIMIT = 200;

/**
 * A validated search request: the text, execution mode, structured filters,
 * and pagination window. Immutable — refinement produces new queries.
 */
export class SearchQuery extends ValueObject<SearchQuery> {
  private constructor(
    private readonly _text: string,
    private readonly _mode: SearchMode,
    private readonly _filters: Readonly<Record<string, SearchFilterValue>>,
    private readonly _limit: number,
    private readonly _offset: number,
  ) {
    super();
  }

  static create(props: {
    text: string;
    mode?: SearchMode;
    filters?: Record<string, SearchFilterValue>;
    limit?: number;
    offset?: number;
  }): SearchQuery {
    const text = props.text.trim();
    if (text.length === 0) {
      throw new ValidationError('Search query text cannot be empty');
    }
    if (text.length > MAX_QUERY_LENGTH) {
      throw new ValidationError(`Search query cannot exceed ${MAX_QUERY_LENGTH} characters`, {
        length: text.length,
      });
    }
    const mode = props.mode ?? 'hybrid';
    if (!(SEARCH_MODES as readonly string[]).includes(mode)) {
      throw new ValidationError(`Unknown search mode: ${mode}`, {
        mode,
        allowed: [...SEARCH_MODES],
      });
    }
    const limit = props.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new ValidationError(`Search limit must be between 1 and ${MAX_LIMIT}`, { limit });
    }
    const offset = props.offset ?? 0;
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError('Search offset must be a non-negative integer', { offset });
    }
    return new SearchQuery(text, mode, Object.freeze({ ...props.filters }), limit, offset);
  }

  get text(): string {
    return this._text;
  }

  get mode(): SearchMode {
    return this._mode;
  }

  get filters(): Readonly<Record<string, SearchFilterValue>> {
    return this._filters;
  }

  get limit(): number {
    return this._limit;
  }

  get offset(): number {
    return this._offset;
  }

  /** New query for the next page of results. */
  nextPage(): SearchQuery {
    return new SearchQuery(
      this._text,
      this._mode,
      this._filters,
      this._limit,
      this._offset + this._limit,
    );
  }

  equals(other: unknown): boolean {
    return (
      other instanceof SearchQuery &&
      other._text === this._text &&
      other._mode === this._mode &&
      other._limit === this._limit &&
      other._offset === this._offset &&
      this.deepEquals(other._filters, this._filters)
    );
  }

  toString(): string {
    return `${this._mode}:"${this._text}"`;
  }
}
