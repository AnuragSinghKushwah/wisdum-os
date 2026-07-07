import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

function assertPositiveInteger(key: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`'${key}' must be a positive integer`, { key, value });
  }
}

/**
 * Capability profile of a text-generation model: how much context it
 * accepts and how much it can produce. Attached to an AIModel of kind
 * `completion`.
 */
export class CompletionModel extends ValueObject<CompletionModel> {
  private constructor(
    private readonly _contextWindowTokens: number,
    private readonly _maxOutputTokens: number,
    private readonly _supportsTools: boolean,
  ) {
    super();
  }

  static create(props: {
    contextWindowTokens: number;
    maxOutputTokens: number;
    supportsTools?: boolean;
  }): CompletionModel {
    assertPositiveInteger('contextWindowTokens', props.contextWindowTokens);
    assertPositiveInteger('maxOutputTokens', props.maxOutputTokens);
    if (props.maxOutputTokens > props.contextWindowTokens) {
      throw new ValidationError('Max output cannot exceed the context window', {
        contextWindowTokens: props.contextWindowTokens,
        maxOutputTokens: props.maxOutputTokens,
      });
    }
    return new CompletionModel(
      props.contextWindowTokens,
      props.maxOutputTokens,
      props.supportsTools ?? false,
    );
  }

  get contextWindowTokens(): number {
    return this._contextWindowTokens;
  }

  get maxOutputTokens(): number {
    return this._maxOutputTokens;
  }

  get supportsTools(): boolean {
    return this._supportsTools;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof CompletionModel &&
      other._contextWindowTokens === this._contextWindowTokens &&
      other._maxOutputTokens === this._maxOutputTokens &&
      other._supportsTools === this._supportsTools
    );
  }

  toString(): string {
    return `completion(ctx=${this._contextWindowTokens}, out=${this._maxOutputTokens})`;
  }
}

/**
 * Capability profile of an embedding model: the dimensionality of its
 * vectors and the largest input it accepts. Attached to an AIModel of
 * kind `embedding`.
 */
export class EmbeddingModel extends ValueObject<EmbeddingModel> {
  private constructor(
    private readonly _dimensions: number,
    private readonly _maxInputTokens: number,
  ) {
    super();
  }

  static create(props: { dimensions: number; maxInputTokens: number }): EmbeddingModel {
    assertPositiveInteger('dimensions', props.dimensions);
    assertPositiveInteger('maxInputTokens', props.maxInputTokens);
    return new EmbeddingModel(props.dimensions, props.maxInputTokens);
  }

  get dimensions(): number {
    return this._dimensions;
  }

  get maxInputTokens(): number {
    return this._maxInputTokens;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof EmbeddingModel &&
      other._dimensions === this._dimensions &&
      other._maxInputTokens === this._maxInputTokens
    );
  }

  toString(): string {
    return `embedding(dim=${this._dimensions})`;
  }
}
