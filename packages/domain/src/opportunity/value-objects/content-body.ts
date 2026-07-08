import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_BODY_LENGTH = 200_000;

/** Markdown body of a content draft or published piece. May be empty while drafting. */
export class ContentBody extends ValueObject<ContentBody> {
  private constructor(private readonly body: string) {
    super();
  }

  static create(value: string): ContentBody {
    if (value.length > MAX_BODY_LENGTH) {
      throw new ValidationError(`Content body cannot exceed ${MAX_BODY_LENGTH} characters`, {
        length: value.length,
      });
    }
    return new ContentBody(value);
  }

  static empty(): ContentBody {
    return new ContentBody('');
  }

  get value(): string {
    return this.body;
  }

  isEmpty(): boolean {
    return this.body.length === 0;
  }

  equals(other: unknown): boolean {
    return other instanceof ContentBody && other.body === this.body;
  }

  toString(): string {
    return this.body;
  }
}
