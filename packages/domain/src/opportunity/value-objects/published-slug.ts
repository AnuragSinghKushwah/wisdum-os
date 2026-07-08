import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 200;

/**
 * URL-safe handle of a published piece of content. The value object
 * validates shape; uniqueness within a tenant is a repository concern
 * (mirrors `KnowledgeSlug`).
 */
export class PublishedSlug extends ValueObject<PublishedSlug> {
  private constructor(private readonly slug: string) {
    super();
  }

  static create(value: string): PublishedSlug {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Published slug cannot be empty');
    }
    if (normalized.length > MAX_SLUG_LENGTH) {
      throw new ValidationError(`Published slug cannot exceed ${MAX_SLUG_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!SLUG_PATTERN.test(normalized)) {
      throw new ValidationError(
        'Published slug must contain only lowercase letters, digits, and single hyphens',
        { value: normalized },
      );
    }
    return new PublishedSlug(normalized);
  }

  get value(): string {
    return this.slug;
  }

  equals(other: unknown): boolean {
    return other instanceof PublishedSlug && other.slug === this.slug;
  }

  toString(): string {
    return this.slug;
  }
}
