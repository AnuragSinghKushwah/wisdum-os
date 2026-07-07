import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MIME_PATTERN = /^[\w-]+\/[\w+.-]+$/;
const MAX_MIME_LENGTH = 255;

/**
 * IANA media type of a document's content (e.g. `text/markdown`,
 * `application/pdf`). Stored lowercase; parameters (`; charset=...`) are
 * not part of the type — encoding is modeled separately.
 */
export class MimeType extends ValueObject<MimeType> {
  private constructor(private readonly mime: string) {
    super();
  }

  static create(value: string): MimeType {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('MIME type cannot be empty');
    }
    if (normalized.length > MAX_MIME_LENGTH) {
      throw new ValidationError(`MIME type cannot exceed ${MAX_MIME_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    if (!MIME_PATTERN.test(normalized)) {
      throw new ValidationError('MIME type is malformed', { value: normalized });
    }
    return new MimeType(normalized);
  }

  get value(): string {
    return this.mime;
  }

  /** The primary type before the slash (e.g. `text`, `application`). */
  get primaryType(): string {
    return this.mime.split('/', 1)[0] ?? this.mime;
  }

  isText(): boolean {
    return this.primaryType === 'text';
  }

  equals(other: unknown): boolean {
    return other instanceof MimeType && other.mime === this.mime;
  }

  toString(): string {
    return this.mime;
  }
}
