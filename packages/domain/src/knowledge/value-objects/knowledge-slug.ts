import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 200;

/**
 * URL-safe handle of a knowledge asset. The value object validates shape;
 * uniqueness within a tenant is a repository concern.
 */
export class KnowledgeSlug extends ValueObject<KnowledgeSlug> {
  private constructor(private readonly slug: string) {
    super();
  }

  static create(value: string): KnowledgeSlug {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Knowledge slug cannot be empty');
    }
    if (normalized.length > MAX_SLUG_LENGTH) {
      throw new ValidationError(`Knowledge slug cannot exceed ${MAX_SLUG_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!SLUG_PATTERN.test(normalized)) {
      throw new ValidationError(
        'Knowledge slug must contain only lowercase letters, digits, and single hyphens',
        { value: normalized },
      );
    }
    return new KnowledgeSlug(normalized);
  }

  get value(): string {
    return this.slug;
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeSlug && other.slug === this.slug;
  }

  toString(): string {
    return this.slug;
  }
}
