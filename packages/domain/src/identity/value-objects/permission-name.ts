import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

// `resource:action` or `domain.resource:action`; action may be the `*` wildcard.
const PERMISSION_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*:([a-z][a-z0-9-]*|\*)$/;
const MAX_LENGTH = 128;

/**
 * Machine-readable permission identifier following `resource:action`
 * (e.g. `document:read`, `knowledge.asset:publish`, `workspace:*`).
 * The `*` action grants every action on the resource.
 */
export class PermissionName extends ValueObject<PermissionName> {
  private constructor(private readonly name: string) {
    super();
  }

  static create(value: string): PermissionName {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Permission name cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Permission name cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!PERMISSION_PATTERN.test(normalized)) {
      throw new ValidationError('Permission name must follow `resource:action`', {
        value: normalized,
      });
    }
    return new PermissionName(normalized);
  }

  get value(): string {
    return this.name;
  }

  /** The resource segment before the colon. */
  get resource(): string {
    return this.name.slice(0, this.name.indexOf(':'));
  }

  /** The action segment after the colon. */
  get action(): string {
    return this.name.slice(this.name.indexOf(':') + 1);
  }

  /** Whether this permission (possibly via `*`) covers the requested one. */
  covers(requested: PermissionName): boolean {
    if (this.resource !== requested.resource) return false;
    return this.action === '*' || this.action === requested.action;
  }

  equals(other: unknown): boolean {
    return other instanceof PermissionName && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}
