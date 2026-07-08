import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { OPPORTUNITY_STATUSES } from '../types/opportunity-types.js';
import type { OpportunityStatusValue } from '../types/opportunity-types.js';

/**
 * The lifecycle state machine of an opportunity: `proposed` (Reason ->
 * Opportunity step), `drafted` (Create step), `published` (Publish step).
 * `dismissed` is a terminal escape hatch from any non-terminal state.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<OpportunityStatusValue, readonly OpportunityStatusValue[]>> =
  {
    proposed: ['drafted', 'dismissed'],
    drafted: ['published', 'dismissed'],
    published: [],
    dismissed: [],
  };

export class OpportunityStatus extends ValueObject<OpportunityStatus> {
  private constructor(private readonly status: OpportunityStatusValue) {
    super();
  }

  static create(value: string): OpportunityStatus {
    if (!(OPPORTUNITY_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown opportunity status: ${value}`, {
        value,
        allowed: [...OPPORTUNITY_STATUSES],
      });
    }
    return new OpportunityStatus(value as OpportunityStatusValue);
  }

  static proposed(): OpportunityStatus {
    return new OpportunityStatus('proposed');
  }

  static drafted(): OpportunityStatus {
    return new OpportunityStatus('drafted');
  }

  static published(): OpportunityStatus {
    return new OpportunityStatus('published');
  }

  static dismissed(): OpportunityStatus {
    return new OpportunityStatus('dismissed');
  }

  get value(): OpportunityStatusValue {
    return this.status;
  }

  is(value: OpportunityStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: OpportunityStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof OpportunityStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
