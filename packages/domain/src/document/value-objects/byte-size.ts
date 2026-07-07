import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

/**
 * Size of a document's content in bytes. Non-negative and bounded by
 * `Number.MAX_SAFE_INTEGER`; quota enforcement is a workspace concern,
 * not a property of the size itself.
 */
export class ByteSize extends ValueObject<ByteSize> {
  private constructor(private readonly bytes: number) {
    super();
  }

  static create(value: number): ByteSize {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new ValidationError('Byte size must be a non-negative safe integer', { value });
    }
    return new ByteSize(value);
  }

  static zero(): ByteSize {
    return new ByteSize(0);
  }

  get value(): number {
    return this.bytes;
  }

  isEmpty(): boolean {
    return this.bytes === 0;
  }

  exceeds(limit: ByteSize): boolean {
    return this.bytes > limit.bytes;
  }

  equals(other: unknown): boolean {
    return other instanceof ByteSize && other.bytes === this.bytes;
  }

  toString(): string {
    return String(this.bytes);
  }
}
