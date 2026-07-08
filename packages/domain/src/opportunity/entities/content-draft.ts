import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import {
  CONTENT_DRAFT_CREATED,
  CONTENT_DRAFT_PUBLISHED,
  OPPORTUNITY_EVENT_SCHEMA_VERSION,
} from '../events/opportunity-events.js';
import type { AnyOpportunityEvent } from '../events/opportunity-events.js';
import { ContentDraftStatus } from '../value-objects/content-draft-status.js';
import type { ContentBody } from '../value-objects/content-body.js';
import type { ContentTitle } from '../value-objects/content-title.js';
import type { ContentDraftId } from '../value-objects/opportunity-ids.js';

/** What callers provide to create a new content draft. */
export interface CreateContentDraftProps {
  readonly id: ContentDraftId;
  readonly tenantId: TenantId;
  readonly opportunityId: UUID;
  readonly title: ContentTitle;
  readonly body: ContentBody;
}

/** Full state needed to rehydrate an existing draft (no events are raised). */
export interface ContentDraftSnapshot {
  readonly id: ContentDraftId;
  readonly tenantId: TenantId;
  readonly opportunityId: UUID;
  readonly title: ContentTitle;
  readonly body: ContentBody;
  readonly status: ContentDraftStatus;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * The Content Engine's output (Product Bible §9): a first draft generated
 * for an Opportunity, editable until published.
 */
export class ContentDraft extends AggregateRoot<ContentDraftId> {
  private readonly _tenantId: TenantId;
  private readonly _opportunityId: UUID;
  private _title: ContentTitle;
  private _body: ContentBody;
  private _status: ContentDraftStatus;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: ContentDraftSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._opportunityId = snapshot.opportunityId;
    this._title = snapshot.title;
    this._body = snapshot.body;
    this._status = snapshot.status;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  static create(props: CreateContentDraftProps, clock: Clock): ContentDraft {
    const now = clock.now();
    const draft = new ContentDraft({
      id: props.id,
      tenantId: props.tenantId,
      opportunityId: props.opportunityId,
      title: props.title,
      body: props.body,
      status: ContentDraftStatus.draft(),
      createdAt: now,
      updatedAt: now,
    });
    draft.raise({
      ...draft.eventEnvelope(now),
      eventType: CONTENT_DRAFT_CREATED,
      payload: { contentDraftId: props.id.value(), opportunityId: props.opportunityId },
    });
    return draft;
  }

  static reconstitute(snapshot: ContentDraftSnapshot): ContentDraft {
    return new ContentDraft(snapshot);
  }

  /** Replace the draft's editable content. Only possible while still a draft. */
  updateContent(title: ContentTitle, body: ContentBody, clock: Clock): void {
    this.ensureEditable();
    this._title = title;
    this._body = body;
    this._updatedAt = clock.now();
  }

  markPublished(clock: Clock): void {
    const now = clock.now();
    if (!this._status.canTransitionTo(ContentDraftStatus.published())) {
      throw new InvariantViolationError(
        `Content draft cannot transition from '${this._status.value}' to 'published'`,
        { contentDraftId: this.id.value(), status: this._status.value },
      );
    }
    this._status = ContentDraftStatus.published();
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: CONTENT_DRAFT_PUBLISHED,
      payload: { contentDraftId: this.id.value(), opportunityId: this._opportunityId },
    });
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get opportunityId(): UUID {
    return this._opportunityId;
  }

  get title(): ContentTitle {
    return this._title;
  }

  get body(): ContentBody {
    return this._body;
  }

  get status(): ContentDraftStatus {
    return this._status;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  private ensureEditable(): void {
    if (!this._status.is('draft')) {
      throw new InvariantViolationError('A published content draft cannot be edited', {
        contentDraftId: this.id.value(),
      });
    }
  }

  private raise(event: AnyOpportunityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: ContentDraftId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: OPPORTUNITY_EVENT_SCHEMA_VERSION,
    };
  }
}
