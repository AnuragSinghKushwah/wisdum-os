import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const PROVIDER_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_LENGTH = 64;

/**
 * Machine-readable AI provider identifier (e.g. `anthropic`, `openai`,
 * `local-ollama`). Providers are integrated as plugins; the domain never
 * hard-codes a vendor.
 */
export class ProviderName extends ValueObject<ProviderName> {
  private constructor(private readonly name: string) {
    super();
  }

  static create(value: string): ProviderName {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Provider name cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Provider name cannot exceed ${MAX_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!PROVIDER_PATTERN.test(normalized)) {
      throw new ValidationError('Provider name must be lowercase kebab-case', {
        value: normalized,
      });
    }
    return new ProviderName(normalized);
  }

  get value(): string {
    return this.name;
  }

  equals(other: unknown): boolean {
    return other instanceof ProviderName && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}
