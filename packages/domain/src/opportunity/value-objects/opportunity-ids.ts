import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(kind: string, value: string): asserts value is UUID {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`${kind} must be a valid UUID`, { value });
  }
}

/** Identity of an Insight aggregate. */
export class InsightId extends Identifier<'InsightId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): InsightId {
    assertUuid('InsightId', value);
    return new InsightId(value as UUID);
  }
}

/** Identity of an Opportunity aggregate. */
export class OpportunityId extends Identifier<'OpportunityId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): OpportunityId {
    assertUuid('OpportunityId', value);
    return new OpportunityId(value as UUID);
  }
}

/** Identity of a ContentDraft aggregate. */
export class ContentDraftId extends Identifier<'ContentDraftId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): ContentDraftId {
    assertUuid('ContentDraftId', value);
    return new ContentDraftId(value as UUID);
  }
}

/** Identity of a PublishedContent aggregate. */
export class PublishedContentId extends Identifier<'PublishedContentId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): PublishedContentId {
    assertUuid('PublishedContentId', value);
    return new PublishedContentId(value as UUID);
  }
}
