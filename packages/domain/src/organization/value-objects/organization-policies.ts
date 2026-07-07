import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import type { PolicyValue } from '../types/organization-types.js';

const POLICY_KEY_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z][a-z0-9]*(-[a-z0-9]+)*)*$/;
const MAX_POLICIES = 200;

/**
 * Organization-wide governance rules as an immutable key-value map, handed
 * down to every workspace (e.g. `sharing.allow-public`, `retention.days`).
 * Keys are dot-namespaced kebab-case; values are JSON scalars.
 */
export class OrganizationPolicies extends ValueObject<OrganizationPolicies> {
  private constructor(private readonly policies: Readonly<Record<string, PolicyValue>>) {
    super();
  }

  static create(policies: Record<string, PolicyValue> = {}): OrganizationPolicies {
    const entries = Object.entries(policies);
    if (entries.length > MAX_POLICIES) {
      throw new ValidationError(`Organization cannot hold more than ${MAX_POLICIES} policies`, {
        count: entries.length,
      });
    }
    for (const [key] of entries) {
      if (!POLICY_KEY_PATTERN.test(key)) {
        throw new ValidationError('Policy keys must be dot-namespaced kebab-case', { key });
      }
    }
    return new OrganizationPolicies(Object.freeze({ ...policies }));
  }

  static empty(): OrganizationPolicies {
    return new OrganizationPolicies(Object.freeze({}));
  }

  get(key: string): PolicyValue | undefined {
    return this.policies[key];
  }

  has(key: string): boolean {
    return key in this.policies;
  }

  /** New policies value with the given key set. */
  with(key: string, value: PolicyValue): OrganizationPolicies {
    return OrganizationPolicies.create({ ...this.policies, [key]: value });
  }

  /** New policies value with the given key removed. */
  without(key: string): OrganizationPolicies {
    const rest = Object.fromEntries(
      Object.entries(this.policies).filter(([existing]) => existing !== key),
    );
    return new OrganizationPolicies(Object.freeze(rest));
  }

  toRecord(): Readonly<Record<string, PolicyValue>> {
    return this.policies;
  }

  equals(other: unknown): boolean {
    return other instanceof OrganizationPolicies && this.deepEquals(other.policies, this.policies);
  }

  toString(): string {
    return JSON.stringify(this.policies);
  }
}
