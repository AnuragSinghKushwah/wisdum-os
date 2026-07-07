import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { CONTENT_ENCODINGS } from '../types/document-types.js';
import type { ContentEncodingValue } from '../types/document-types.js';

/**
 * How the document's stored bytes encode its content. The platform default
 * is UTF-8; other encodings exist for imported legacy content and binary
 * payloads carried as base64.
 */
export class ContentEncoding extends ValueObject<ContentEncoding> {
  private constructor(private readonly encoding: ContentEncodingValue) {
    super();
  }

  static create(value: string): ContentEncoding {
    const normalized = value.trim().toLowerCase();
    if (!(CONTENT_ENCODINGS as readonly string[]).includes(normalized)) {
      throw new ValidationError(`Unknown content encoding: ${value}`, {
        value,
        allowed: [...CONTENT_ENCODINGS],
      });
    }
    return new ContentEncoding(normalized as ContentEncodingValue);
  }

  static utf8(): ContentEncoding {
    return new ContentEncoding('utf-8');
  }

  get value(): ContentEncodingValue {
    return this.encoding;
  }

  equals(other: unknown): boolean {
    return other instanceof ContentEncoding && other.encoding === this.encoding;
  }

  toString(): string {
    return this.encoding;
  }
}
