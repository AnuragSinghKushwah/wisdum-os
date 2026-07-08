import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { CONTENT_DRAFT_STATUSES } from '../types/opportunity-types.js';
import type { ContentDraftStatusValue } from '../types/opportunity-types.js';

const ALLOWED_TRANSITIONS: Readonly<Record<ContentDraftStatusValue, readonly ContentDraftStatusValue[]>> =
  {
    draft: ['published'],
    published: [],
  };

export class ContentDraftStatus extends ValueObject<ContentDraftStatus> {
  private constructor(private readonly status: ContentDraftStatusValue) {
    super();
  }

  static create(value: string): ContentDraftStatus {
    if (!(CONTENT_DRAFT_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown content draft status: ${value}`, {
        value,
        allowed: [...CONTENT_DRAFT_STATUSES],
      });
    }
    return new ContentDraftStatus(value as ContentDraftStatusValue);
  }

  static draft(): ContentDraftStatus {
    return new ContentDraftStatus('draft');
  }

  static published(): ContentDraftStatus {
    return new ContentDraftStatus('published');
  }

  get value(): ContentDraftStatusValue {
    return this.status;
  }

  is(value: ContentDraftStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: ContentDraftStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof ContentDraftStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
