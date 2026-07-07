import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_TITLE_LENGTH = 300;

/** Human-readable title of a knowledge asset. Never empty. */
export class KnowledgeTitle extends ValueObject<KnowledgeTitle> {
  private constructor(private readonly title: string) {
    super();
  }

  static create(value: string): KnowledgeTitle {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Knowledge title cannot be empty');
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`Knowledge title cannot exceed ${MAX_TITLE_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new KnowledgeTitle(trimmed);
  }

  get value(): string {
    return this.title;
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeTitle && other.title === this.title;
  }

  toString(): string {
    return this.title;
  }
}
