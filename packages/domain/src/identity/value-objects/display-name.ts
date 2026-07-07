import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MIN_LENGTH = 1;
const MAX_LENGTH = 100;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * Human-readable name shown for a user or service account. Free-form text,
 * trimmed; control characters are rejected to keep rendering surfaces safe.
 */
export class DisplayName extends ValueObject<DisplayName> {
  private constructor(private readonly name: string) {
    super();
  }

  static create(value: string): DisplayName {
    const trimmed = value.trim();
    if (trimmed.length < MIN_LENGTH) {
      throw new ValidationError('Display name cannot be empty');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new ValidationError(`Display name cannot exceed ${MAX_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    if (CONTROL_CHARS.test(trimmed)) {
      throw new ValidationError('Display name cannot contain control characters');
    }
    return new DisplayName(trimmed);
  }

  get value(): string {
    return this.name;
  }

  equals(other: unknown): boolean {
    return other instanceof DisplayName && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}
