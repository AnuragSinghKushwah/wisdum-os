import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_RATIONALE_LENGTH = 2000;

/** Why this opportunity was proposed. Never empty. */
export class OpportunityRationale extends ValueObject<OpportunityRationale> {
  private constructor(private readonly rationale: string) {
    super();
  }

  static create(value: string): OpportunityRationale {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Opportunity rationale cannot be empty');
    }
    if (trimmed.length > MAX_RATIONALE_LENGTH) {
      throw new ValidationError(
        `Opportunity rationale cannot exceed ${MAX_RATIONALE_LENGTH} characters`,
        { length: trimmed.length },
      );
    }
    return new OpportunityRationale(trimmed);
  }

  get value(): string {
    return this.rationale;
  }

  equals(other: unknown): boolean {
    return other instanceof OpportunityRationale && other.rationale === this.rationale;
  }

  toString(): string {
    return this.rationale;
  }
}
