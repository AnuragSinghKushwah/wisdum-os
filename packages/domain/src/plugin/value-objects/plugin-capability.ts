import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const CAPABILITY_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z][a-z0-9]*(-[a-z0-9]+)*)*$/;
const MAX_LENGTH = 128;

/**
 * A capability contract a plugin implements (e.g. `ai.llm-provider`,
 * `storage.blob-provider`, `publishing.target`). The kernel resolves
 * capability requests to enabled plugins that declare them.
 */
export class PluginCapability extends ValueObject<PluginCapability> {
  private constructor(private readonly capability: string) {
    super();
  }

  static create(value: string): PluginCapability {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Plugin capability cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Plugin capability cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!CAPABILITY_PATTERN.test(normalized)) {
      throw new ValidationError('Plugin capability must be dot-namespaced kebab-case', {
        value: normalized,
      });
    }
    return new PluginCapability(normalized);
  }

  get value(): string {
    return this.capability;
  }

  equals(other: unknown): boolean {
    return other instanceof PluginCapability && other.capability === this.capability;
  }

  toString(): string {
    return this.capability;
  }
}
