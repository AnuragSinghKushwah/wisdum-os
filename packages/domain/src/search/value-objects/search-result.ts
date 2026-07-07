import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import type { SearchSourceType } from '../types/search-types.js';
import type { ChunkReference } from './chunk-reference.js';

/**
 * One scored hit returned by a search. Scores are normalized to [0, 1] so
 * results from different engines and modes can be merged and compared.
 */
export class SearchResult extends ValueObject<SearchResult> {
  private constructor(
    private readonly _sourceId: UUID,
    private readonly _sourceType: SearchSourceType,
    private readonly _score: number,
    private readonly _highlights: readonly string[],
    private readonly _chunk?: ChunkReference,
  ) {
    super();
  }

  static create(props: {
    sourceId: UUID;
    sourceType: SearchSourceType;
    score: number;
    highlights?: readonly string[];
    chunk?: ChunkReference;
  }): SearchResult {
    if (!Number.isFinite(props.score) || props.score < 0 || props.score > 1) {
      throw new ValidationError('Search score must be a number between 0 and 1', {
        score: props.score,
      });
    }
    return new SearchResult(
      props.sourceId,
      props.sourceType,
      props.score,
      Object.freeze([...(props.highlights ?? [])]),
      props.chunk,
    );
  }

  get sourceId(): UUID {
    return this._sourceId;
  }

  get sourceType(): SearchSourceType {
    return this._sourceType;
  }

  get score(): number {
    return this._score;
  }

  get highlights(): readonly string[] {
    return this._highlights;
  }

  get chunk(): ChunkReference | undefined {
    return this._chunk;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof SearchResult &&
      other._sourceId === this._sourceId &&
      other._sourceType === this._sourceType &&
      other._score === this._score &&
      other._highlights.length === this._highlights.length &&
      other._highlights.every((highlight, index) => highlight === this._highlights[index]) &&
      (other._chunk === undefined
        ? this._chunk === undefined
        : this._chunk !== undefined && other._chunk.equals(this._chunk))
    );
  }

  toString(): string {
    return `${this._sourceType}:${this._sourceId}@${this._score.toFixed(3)}`;
  }
}
