import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

// Same shape as Identity's PermissionName: `resource:action`, `*` action allowed.
const PERMISSION_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*:([a-z][a-z0-9-]*|\*)$/;
const MAX_LENGTH = 128;

/**
 * A platform permission a plugin requests in its manifest (e.g.
 * `document:read`, `knowledge.asset:write`). Declared up front so
 * installation can present an auditable consent screen; the runtime
 * enforces that a plugin never acts beyond its granted set.
 */
export class PluginPermission extends ValueObject<PluginPermission> {
  private constructor(private readonly permission: string) {
    super();
  }

  static create(value: string): PluginPermission {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Plugin permission cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Plugin permission cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!PERMISSION_PATTERN.test(normalized)) {
      throw new ValidationError('Plugin permission must follow `resource:action`', {
        value: normalized,
      });
    }
    return new PluginPermission(normalized);
  }

  get value(): string {
    return this.permission;
  }

  equals(other: unknown): boolean {
    return other instanceof PluginPermission && other.permission === this.permission;
  }

  toString(): string {
    return this.permission;
  }
}
