import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const ROLE_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_LENGTH = 64;

/**
 * Machine-readable role identifier (e.g. `workspace-admin`, `viewer`).
 * Lowercase kebab-case; display labels are a presentation concern.
 */
export class RoleName extends ValueObject<RoleName> {
  private constructor(private readonly name: string) {
    super();
  }

  static create(value: string): RoleName {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Role name cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Role name cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!ROLE_NAME_PATTERN.test(normalized)) {
      throw new ValidationError('Role name must be lowercase kebab-case', { value: normalized });
    }
    return new RoleName(normalized);
  }

  get value(): string {
    return this.name;
  }

  equals(other: unknown): boolean {
    return other instanceof RoleName && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}
