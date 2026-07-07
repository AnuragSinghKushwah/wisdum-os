import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LENGTH = 80;

/**
 * URL-safe, platform-unique identifier of an organization. Generation
 * (from the name) happens outside the domain; this validates only.
 */
export class OrganizationSlug extends ValueObject<OrganizationSlug> {
  private constructor(private readonly slug: string) {
    super();
  }

  static create(value: string): OrganizationSlug {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Organization slug cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Organization slug cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!SLUG_PATTERN.test(normalized)) {
      throw new ValidationError('Organization slug must be lowercase kebab-case', {
        value: normalized,
      });
    }
    return new OrganizationSlug(normalized);
  }

  get value(): string {
    return this.slug;
  }

  equals(other: unknown): boolean {
    return other instanceof OrganizationSlug && other.slug === this.slug;
  }

  toString(): string {
    return this.slug;
  }
}
