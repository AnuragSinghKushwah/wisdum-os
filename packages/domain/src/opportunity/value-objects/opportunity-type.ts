import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { OPPORTUNITY_TYPES } from '../types/opportunity-types.js';
import type { OpportunityTypeValue } from '../types/opportunity-types.js';

/** The kind of output an opportunity proposes (Product Bible §8). Fixed at creation. */
export class OpportunityType extends ValueObject<OpportunityType> {
  private constructor(private readonly type: OpportunityTypeValue) {
    super();
  }

  static create(value: string): OpportunityType {
    if (!(OPPORTUNITY_TYPES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown opportunity type: ${value}`, {
        value,
        allowed: [...OPPORTUNITY_TYPES],
      });
    }
    return new OpportunityType(value as OpportunityTypeValue);
  }

  get value(): OpportunityTypeValue {
    return this.type;
  }

  equals(other: unknown): boolean {
    return other instanceof OpportunityType && other.type === this.type;
  }

  toString(): string {
    return this.type;
  }
}
