import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MIME_PATTERN = /^[\w-]+\/[\w+.-]+$/;
const MAX_REFERENCE_LENGTH = 1000;

/**
 * Opaque pointer to stored content (e.g. an object-storage key). Knowledge
 * is the canonical record, not the document itself — the actual bytes live
 * behind content references, resolved by the storage capability.
 */
export class ContentReference extends ValueObject<ContentReference> {
  private constructor(
    private readonly ref: string,
    private readonly mime: string | null,
  ) {
    super();
  }

  static create(props: { reference: string; mimeType?: string | null }): ContentReference {
    const reference = props.reference.trim();
    if (reference.length === 0) {
      throw new ValidationError('Content reference cannot be empty');
    }
    if (reference.length > MAX_REFERENCE_LENGTH) {
      throw new ValidationError(
        `Content reference cannot exceed ${MAX_REFERENCE_LENGTH} characters`,
        { length: reference.length },
      );
    }

    const trimmedMime = props.mimeType?.trim() ?? '';
    const mimeType = trimmedMime.length > 0 ? trimmedMime : null;
    if (mimeType !== null && !MIME_PATTERN.test(mimeType)) {
      throw new ValidationError('Content reference MIME type is malformed', { mimeType });
    }

    return new ContentReference(reference, mimeType);
  }

  get reference(): string {
    return this.ref;
  }

  get mimeType(): string | null {
    return this.mime;
  }

  equals(other: unknown): boolean {
    return other instanceof ContentReference && other.ref === this.ref && other.mime === this.mime;
  }

  toString(): string {
    return this.ref;
  }
}
