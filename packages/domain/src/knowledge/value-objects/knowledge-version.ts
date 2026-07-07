import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

/**
 * Monotonic revision counter of a knowledge asset. Starts at 1; the only
 * way to obtain a different version is `next()`, so versions can never
 * decrease.
 */
export class KnowledgeVersion extends ValueObject<KnowledgeVersion> {
  private constructor(private readonly version: number) {
    super();
  }

  static initial(): KnowledgeVersion {
    return new KnowledgeVersion(1);
  }

  static create(value: number): KnowledgeVersion {
    if (!Number.isInteger(value) || value < 1) {
      throw new ValidationError('Knowledge version must be a positive integer', { value });
    }
    return new KnowledgeVersion(value);
  }

  get value(): number {
    return this.version;
  }

  next(): KnowledgeVersion {
    return new KnowledgeVersion(this.version + 1);
  }

  isAfter(other: KnowledgeVersion): boolean {
    return this.version > other.version;
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeVersion && other.version === this.version;
  }

  toString(): string {
    return String(this.version);
  }
}
