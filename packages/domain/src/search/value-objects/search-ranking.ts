import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const EPSILON = 1e-9;

/**
 * How an index blends signals when scoring hybrid results. Weights must sum
 * to 1 so scores stay comparable across configurations.
 */
export class SearchRanking extends ValueObject<SearchRanking> {
  private constructor(
    private readonly _keywordWeight: number,
    private readonly _semanticWeight: number,
    private readonly _recencyWeight: number,
  ) {
    super();
  }

  static create(props: {
    keywordWeight: number;
    semanticWeight: number;
    recencyWeight?: number;
  }): SearchRanking {
    const recencyWeight = props.recencyWeight ?? 0;
    const weights = [props.keywordWeight, props.semanticWeight, recencyWeight];
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 1)) {
      throw new ValidationError('Ranking weights must be numbers between 0 and 1', {
        weights,
      });
    }
    const sum = weights.reduce((total, weight) => total + weight, 0);
    if (Math.abs(sum - 1) > EPSILON) {
      throw new ValidationError('Ranking weights must sum to 1', { sum });
    }
    return new SearchRanking(props.keywordWeight, props.semanticWeight, recencyWeight);
  }

  /** Even keyword/semantic split — the default for hybrid indexes. */
  static balanced(): SearchRanking {
    return new SearchRanking(0.5, 0.5, 0);
  }

  get keywordWeight(): number {
    return this._keywordWeight;
  }

  get semanticWeight(): number {
    return this._semanticWeight;
  }

  get recencyWeight(): number {
    return this._recencyWeight;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof SearchRanking &&
      other._keywordWeight === this._keywordWeight &&
      other._semanticWeight === this._semanticWeight &&
      other._recencyWeight === this._recencyWeight
    );
  }

  toString(): string {
    return `kw=${this._keywordWeight} sem=${this._semanticWeight} rec=${this._recencyWeight}`;
  }
}
