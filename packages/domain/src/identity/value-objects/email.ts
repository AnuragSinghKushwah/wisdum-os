import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

// Pragmatic RFC 5322 subset: local part, one @, dot-separated domain labels.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_EMAIL_LENGTH = 254;

/**
 * Email address of a user. Normalized to lowercase — the domain treats
 * addresses as case-insensitive identifiers, matching mail-provider reality.
 */
export class Email extends ValueObject<Email> {
  private constructor(private readonly address: string) {
    super();
  }

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Email cannot be empty');
    }
    if (normalized.length > MAX_EMAIL_LENGTH) {
      throw new ValidationError(`Email cannot exceed ${MAX_EMAIL_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('Email is malformed', { value: normalized });
    }
    return new Email(normalized);
  }

  get value(): string {
    return this.address;
  }

  /** The domain part after the @ (e.g. `example.com`). */
  get domain(): string {
    return this.address.slice(this.address.lastIndexOf('@') + 1);
  }

  equals(other: unknown): boolean {
    return other instanceof Email && other.address === this.address;
  }

  toString(): string {
    return this.address;
  }
}
