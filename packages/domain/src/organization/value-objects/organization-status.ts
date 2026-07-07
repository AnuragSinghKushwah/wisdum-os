import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { ORGANIZATION_STATUSES } from '../types/organization-types.js';
import type { OrganizationStatusValue } from '../types/organization-types.js';

/**
 * Lifecycle state machine of an organization. Suspension (e.g. for unpaid
 * subscriptions) is reversible; deletion is terminal.
 */
const ALLOWED_TRANSITIONS: Readonly<
  Record<OrganizationStatusValue, readonly OrganizationStatusValue[]>
> = {
  active: ['suspended', 'deleted'],
  suspended: ['active', 'deleted'],
  deleted: [],
};

export class OrganizationStatus extends ValueObject<OrganizationStatus> {
  private constructor(private readonly status: OrganizationStatusValue) {
    super();
  }

  static create(value: string): OrganizationStatus {
    if (!(ORGANIZATION_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown organization status: ${value}`, {
        value,
        allowed: [...ORGANIZATION_STATUSES],
      });
    }
    return new OrganizationStatus(value as OrganizationStatusValue);
  }

  static active(): OrganizationStatus {
    return new OrganizationStatus('active');
  }

  static suspended(): OrganizationStatus {
    return new OrganizationStatus('suspended');
  }

  static deleted(): OrganizationStatus {
    return new OrganizationStatus('deleted');
  }

  get value(): OrganizationStatusValue {
    return this.status;
  }

  is(value: OrganizationStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: OrganizationStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof OrganizationStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
