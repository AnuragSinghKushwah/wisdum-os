import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LENGTH = 80;

/**
 * URL-safe identifier of a workspace, unique within an organization.
 * Generation (from the name) happens outside the domain; this validates only.
 */
export class WorkspaceSlug extends ValueObject<WorkspaceSlug> {
  private constructor(private readonly slug: string) {
    super();
  }

  static create(value: string): WorkspaceSlug {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Workspace slug cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Workspace slug cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!SLUG_PATTERN.test(normalized)) {
      throw new ValidationError('Workspace slug must be lowercase kebab-case', {
        value: normalized,
      });
    }
    return new WorkspaceSlug(normalized);
  }

  get value(): string {
    return this.slug;
  }

  equals(other: unknown): boolean {
    return other instanceof WorkspaceSlug && other.slug === this.slug;
  }

  toString(): string {
    return this.slug;
  }
}
