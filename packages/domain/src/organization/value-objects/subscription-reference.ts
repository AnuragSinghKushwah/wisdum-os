import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { SUBSCRIPTION_STATES } from '../types/organization-types.js';
import type { SubscriptionState } from '../types/organization-types.js';

const PLAN_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_REF_LENGTH = 255;

/**
 * A pointer to the organization's subscription in the billing system.
 * The domain knows the plan name, the external reference, and the billing
 * state — nothing about prices, invoices, or payment methods. Billing is
 * a plugin concern.
 */
export class SubscriptionReference extends ValueObject<SubscriptionReference> {
  private constructor(
    private readonly _plan: string,
    private readonly _externalRef: string,
    private readonly _state: SubscriptionState,
  ) {
    super();
  }

  static create(props: {
    plan: string;
    externalRef: string;
    state: SubscriptionState;
  }): SubscriptionReference {
    const plan = props.plan.trim().toLowerCase();
    if (!PLAN_PATTERN.test(plan)) {
      throw new ValidationError('Subscription plan must be lowercase kebab-case', {
        plan: props.plan,
      });
    }
    const externalRef = props.externalRef.trim();
    if (externalRef.length === 0 || externalRef.length > MAX_REF_LENGTH) {
      throw new ValidationError('Subscription external reference is malformed', {
        length: externalRef.length,
      });
    }
    if (!(SUBSCRIPTION_STATES as readonly string[]).includes(props.state)) {
      throw new ValidationError(`Unknown subscription state: ${props.state}`, {
        state: props.state,
        allowed: [...SUBSCRIPTION_STATES],
      });
    }
    return new SubscriptionReference(plan, externalRef, props.state);
  }

  /** Default reference for newly created organizations before billing is wired up. */
  static freeTier(): SubscriptionReference {
    return new SubscriptionReference('free', 'none', 'active');
  }

  get plan(): string {
    return this._plan;
  }

  get externalRef(): string {
    return this._externalRef;
  }

  get state(): SubscriptionState {
    return this._state;
  }

  isInGoodStanding(): boolean {
    return this._state === 'active' || this._state === 'trialing';
  }

  equals(other: unknown): boolean {
    return (
      other instanceof SubscriptionReference &&
      other._plan === this._plan &&
      other._externalRef === this._externalRef &&
      other._state === this._state
    );
  }

  toString(): string {
    return `${this._plan}:${this._state}`;
  }
}
