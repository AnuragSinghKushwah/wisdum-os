import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MIN_HASH_LENGTH = 32;
const MAX_HASH_LENGTH = 512;

/**
 * An already-hashed secret (password or API key). The domain never sees
 * plaintext credentials and never hashes — hashing is an infrastructure
 * concern. `toString()` redacts the value so hashes cannot leak through
 * logging or event payloads by accident.
 */
export class PasswordHash extends ValueObject<PasswordHash> {
  private constructor(private readonly hash: string) {
    super();
  }

  static create(value: string): PasswordHash {
    const trimmed = value.trim();
    if (trimmed.length < MIN_HASH_LENGTH) {
      throw new ValidationError('Password hash is too short to be a real hash', {
        length: trimmed.length,
      });
    }
    if (trimmed.length > MAX_HASH_LENGTH) {
      throw new ValidationError(`Password hash cannot exceed ${MAX_HASH_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new PasswordHash(trimmed);
  }

  /** The stored hash, for infrastructure-level verification only. */
  get value(): string {
    return this.hash;
  }

  equals(other: unknown): boolean {
    return other instanceof PasswordHash && other.hash === this.hash;
  }

  toString(): string {
    return '[redacted]';
  }
}
