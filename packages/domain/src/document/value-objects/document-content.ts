import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

/** Inline content ceiling — larger payloads belong in blob storage. */
const MAX_CONTENT_LENGTH = 10_000_000;

/**
 * The content of a document as an immutable body of text (or base64-carried
 * bytes — the aggregate's ContentEncoding says how to read it). Empty
 * content is legal: a document can be created before its content arrives.
 */
export class DocumentContent extends ValueObject<DocumentContent> {
  private constructor(private readonly body: string) {
    super();
  }

  static create(value: string): DocumentContent {
    if (value.length > MAX_CONTENT_LENGTH) {
      throw new ValidationError(
        `Inline document content cannot exceed ${MAX_CONTENT_LENGTH} characters`,
        { length: value.length },
      );
    }
    return new DocumentContent(value);
  }

  static empty(): DocumentContent {
    return new DocumentContent('');
  }

  get value(): string {
    return this.body;
  }

  get length(): number {
    return this.body.length;
  }

  isEmpty(): boolean {
    return this.body.length === 0;
  }

  equals(other: unknown): boolean {
    return other instanceof DocumentContent && other.body === this.body;
  }

  toString(): string {
    return this.body;
  }
}
