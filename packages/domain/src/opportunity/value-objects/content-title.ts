import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_TITLE_LENGTH = 300;

/** Human-readable title of a content draft. Never empty. */
export class ContentTitle extends ValueObject<ContentTitle> {
  private constructor(private readonly title: string) {
    super();
  }

  static create(value: string): ContentTitle {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Content title cannot be empty');
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`Content title cannot exceed ${MAX_TITLE_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new ContentTitle(trimmed);
  }

  get value(): string {
    return this.title;
  }

  equals(other: unknown): boolean {
    return other instanceof ContentTitle && other.title === this.title;
  }

  toString(): string {
    return this.title;
  }
}
