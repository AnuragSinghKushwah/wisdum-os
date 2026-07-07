import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

// `publisher/plugin` — both segments lowercase kebab-case.
const PLUGIN_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*\/[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_LENGTH = 128;

/**
 * Globally unique plugin identifier in `publisher/plugin` form
 * (e.g. `wisdum/github`, `acme/notion-sync`). The publisher namespace
 * prevents name collisions across the open plugin ecosystem.
 */
export class PluginName extends ValueObject<PluginName> {
  private constructor(private readonly name: string) {
    super();
  }

  static create(value: string): PluginName {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Plugin name cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Plugin name cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!PLUGIN_NAME_PATTERN.test(normalized)) {
      throw new ValidationError('Plugin name must follow `publisher/plugin` in kebab-case', {
        value: normalized,
      });
    }
    return new PluginName(normalized);
  }

  get value(): string {
    return this.name;
  }

  get publisher(): string {
    return this.name.slice(0, this.name.indexOf('/'));
  }

  get shortName(): string {
    return this.name.slice(this.name.indexOf('/') + 1);
  }

  equals(other: unknown): boolean {
    return other instanceof PluginName && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}
