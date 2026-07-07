import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const FLAG_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z][a-z0-9]*(-[a-z0-9]+)*)*$/;
const MAX_FLAGS = 200;

/**
 * Per-workspace feature toggles as an immutable map of kebab-case flag
 * names to booleans. A flag not present is disabled — absence and `false`
 * are equivalent, so payloads stay small.
 */
export class FeatureFlags extends ValueObject<FeatureFlags> {
  private constructor(private readonly flags: Readonly<Record<string, boolean>>) {
    super();
  }

  static create(flags: Record<string, boolean> = {}): FeatureFlags {
    const entries = Object.entries(flags);
    if (entries.length > MAX_FLAGS) {
      throw new ValidationError(`Workspace cannot hold more than ${MAX_FLAGS} feature flags`, {
        count: entries.length,
      });
    }
    for (const [name] of entries) {
      if (!FLAG_NAME_PATTERN.test(name)) {
        throw new ValidationError('Feature flag names must be dot-namespaced kebab-case', {
          name,
        });
      }
    }
    return new FeatureFlags(Object.freeze({ ...flags }));
  }

  static empty(): FeatureFlags {
    return new FeatureFlags(Object.freeze({}));
  }

  isEnabled(name: string): boolean {
    return this.flags[name] === true;
  }

  /** New flags value with the given flag set. */
  with(name: string, enabled: boolean): FeatureFlags {
    return FeatureFlags.create({ ...this.flags, [name]: enabled });
  }

  toRecord(): Readonly<Record<string, boolean>> {
    return this.flags;
  }

  equals(other: unknown): boolean {
    return other instanceof FeatureFlags && this.deepEquals(other.flags, this.flags);
  }

  toString(): string {
    return JSON.stringify(this.flags);
  }
}
