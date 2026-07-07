import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

/**
 * Token consumption of one model invocation (or an accumulation of many).
 * Immutable; accumulation produces new values. Cost calculation is a
 * billing concern and stays outside the domain.
 */
export class TokenUsage extends ValueObject<TokenUsage> {
  private constructor(
    private readonly _inputTokens: number,
    private readonly _outputTokens: number,
  ) {
    super();
  }

  static create(props: { inputTokens: number; outputTokens: number }): TokenUsage {
    for (const [key, value] of Object.entries(props)) {
      if (!Number.isInteger(value) || value < 0) {
        throw new ValidationError(`Token count '${key}' must be a non-negative integer`, {
          key,
          value,
        });
      }
    }
    return new TokenUsage(props.inputTokens, props.outputTokens);
  }

  static zero(): TokenUsage {
    return new TokenUsage(0, 0);
  }

  get inputTokens(): number {
    return this._inputTokens;
  }

  get outputTokens(): number {
    return this._outputTokens;
  }

  get totalTokens(): number {
    return this._inputTokens + this._outputTokens;
  }

  add(other: TokenUsage): TokenUsage {
    return new TokenUsage(
      this._inputTokens + other._inputTokens,
      this._outputTokens + other._outputTokens,
    );
  }

  equals(other: unknown): boolean {
    return (
      other instanceof TokenUsage &&
      other._inputTokens === this._inputTokens &&
      other._outputTokens === this._outputTokens
    );
  }

  toString(): string {
    return `in=${this._inputTokens} out=${this._outputTokens}`;
  }
}
