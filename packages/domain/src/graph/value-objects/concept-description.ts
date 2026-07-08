import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_DESCRIPTION_LENGTH = 2000;

/** Optional prose description of a concept. May be empty. */
export class ConceptDescription extends ValueObject<ConceptDescription> {
  private constructor(private readonly description: string) {
    super();
  }

  static create(value: string): ConceptDescription {
    const trimmed = value.trim();
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError(
        `Concept description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
        { length: trimmed.length },
      );
    }
    return new ConceptDescription(trimmed);
  }

  static empty(): ConceptDescription {
    return new ConceptDescription('');
  }

  get value(): string {
    return this.description;
  }

  isEmpty(): boolean {
    return this.description.length === 0;
  }

  equals(other: unknown): boolean {
    return other instanceof ConceptDescription && other.description === this.description;
  }

  toString(): string {
    return this.description;
  }
}
