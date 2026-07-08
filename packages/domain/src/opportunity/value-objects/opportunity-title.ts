import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_TITLE_LENGTH = 300;

/** Human-readable title of an opportunity. Never empty. */
export class OpportunityTitle extends ValueObject<OpportunityTitle> {
  private constructor(private readonly title: string) {
    super();
  }

  static create(value: string): OpportunityTitle {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Opportunity title cannot be empty');
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`Opportunity title cannot exceed ${MAX_TITLE_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new OpportunityTitle(trimmed);
  }

  get value(): string {
    return this.title;
  }

  equals(other: unknown): boolean {
    return other instanceof OpportunityTitle && other.title === this.title;
  }

  toString(): string {
    return this.title;
  }
}
