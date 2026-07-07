import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { USER_STATUSES } from '../types/identity-types.js';
import type { UserStatusValue } from '../types/identity-types.js';

/**
 * Lifecycle state machine of a user. Suspension is reversible; deletion is
 * terminal (the record survives for audit, the actor is gone).
 */
const ALLOWED_TRANSITIONS: Readonly<Record<UserStatusValue, readonly UserStatusValue[]>> = {
  active: ['suspended', 'deleted'],
  suspended: ['active', 'deleted'],
  deleted: [],
};

export class UserStatus extends ValueObject<UserStatus> {
  private constructor(private readonly status: UserStatusValue) {
    super();
  }

  static create(value: string): UserStatus {
    if (!(USER_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown user status: ${value}`, {
        value,
        allowed: [...USER_STATUSES],
      });
    }
    return new UserStatus(value as UserStatusValue);
  }

  static active(): UserStatus {
    return new UserStatus('active');
  }

  static suspended(): UserStatus {
    return new UserStatus('suspended');
  }

  static deleted(): UserStatus {
    return new UserStatus('deleted');
  }

  get value(): UserStatusValue {
    return this.status;
  }

  is(value: UserStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: UserStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof UserStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
