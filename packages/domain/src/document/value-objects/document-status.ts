import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { DOCUMENT_STATUSES } from '../types/document-types.js';
import type { DocumentStatusValue } from '../types/document-types.js';

/**
 * The lifecycle state machine of a document. Deliberately small — documents
 * carry no processing pipeline (that belongs to Knowledge): a document is
 * live, replaced by a newer revision, or deleted. `deleted` is terminal.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<DocumentStatusValue, readonly DocumentStatusValue[]>> = {
  active: ['superseded', 'deleted'],
  superseded: ['deleted'],
  deleted: [],
};

export class DocumentStatus extends ValueObject<DocumentStatus> {
  private constructor(private readonly status: DocumentStatusValue) {
    super();
  }

  static create(value: string): DocumentStatus {
    if (!(DOCUMENT_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown document status: ${value}`, {
        value,
        allowed: [...DOCUMENT_STATUSES],
      });
    }
    return new DocumentStatus(value as DocumentStatusValue);
  }

  static active(): DocumentStatus {
    return new DocumentStatus('active');
  }

  static superseded(): DocumentStatus {
    return new DocumentStatus('superseded');
  }

  static deleted(): DocumentStatus {
    return new DocumentStatus('deleted');
  }

  get value(): DocumentStatusValue {
    return this.status;
  }

  is(value: DocumentStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: DocumentStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof DocumentStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
