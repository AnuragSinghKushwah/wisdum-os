import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_DESCRIPTION_LENGTH = 5000;

/** Optional prose description of a knowledge asset. May be empty. */
export class KnowledgeDescription extends ValueObject<KnowledgeDescription> {
  private constructor(private readonly description: string) {
    super();
  }

  static create(value: string): KnowledgeDescription {
    const trimmed = value.trim();
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError(
        `Knowledge description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
        { length: trimmed.length },
      );
    }
    return new KnowledgeDescription(trimmed);
  }

  static empty(): KnowledgeDescription {
    return new KnowledgeDescription('');
  }

  get value(): string {
    return this.description;
  }

  isEmpty(): boolean {
    return this.description.length === 0;
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeDescription && other.description === this.description;
  }

  toString(): string {
    return this.description;
  }
}
