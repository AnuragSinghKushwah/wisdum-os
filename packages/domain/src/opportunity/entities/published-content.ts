import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { CONTENT_PUBLISHED, OPPORTUNITY_EVENT_SCHEMA_VERSION } from '../events/opportunity-events.js';
import type { AnyOpportunityEvent } from '../events/opportunity-events.js';
import type { ContentBody } from '../value-objects/content-body.js';
import type { ContentTitle } from '../value-objects/content-title.js';
import type { PublishedSlug } from '../value-objects/published-slug.js';
import type { PublishedContentId } from '../value-objects/opportunity-ids.js';

/** What callers provide to create a new published content record. */
export interface CreatePublishedContentProps {
  readonly id: PublishedContentId;
  readonly tenantId: TenantId;
  readonly draftId: UUID;
  readonly opportunityId: UUID;
  readonly slug: PublishedSlug;
  readonly title: ContentTitle;
  readonly body: ContentBody;
  /** The plugin capability that produced this record, e.g. `publishing.website`. */
  readonly providerCapability: string;
  /** Where this content lives, as reported by the provider that published it. */
  readonly externalUrl: string;
}

/** Full state needed to rehydrate an existing published record (no events are raised). */
export interface PublishedContentSnapshot {
  readonly id: PublishedContentId;
  readonly tenantId: TenantId;
  readonly draftId: UUID;
  readonly opportunityId: UUID;
  readonly slug: PublishedSlug;
  readonly title: ContentTitle;
  readonly body: ContentBody;
  readonly viewCount: number;
  readonly publishedAt: IsoTimestamp;
  readonly providerCapability: string;
  readonly externalUrl: string;
}

/**
 * The Publishing Engine's output for this POC (Product Bible §10): a
 * publicly viewable snapshot of a content draft. `viewCount` is the
 * Measure step (§11); feeding it back into future opportunity scoring
 * (Learn, §11) is explicitly out of scope for this POC.
 */
export class PublishedContent extends AggregateRoot<PublishedContentId> {
  private readonly _tenantId: TenantId;
  private readonly _draftId: UUID;
  private readonly _opportunityId: UUID;
  private readonly _slug: PublishedSlug;
  private readonly _title: ContentTitle;
  private readonly _body: ContentBody;
  private _viewCount: number;
  private readonly _publishedAt: IsoTimestamp;
  private readonly _providerCapability: string;
  private readonly _externalUrl: string;

  private constructor(snapshot: PublishedContentSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._draftId = snapshot.draftId;
    this._opportunityId = snapshot.opportunityId;
    this._slug = snapshot.slug;
    this._title = snapshot.title;
    this._body = snapshot.body;
    this._viewCount = snapshot.viewCount;
    this._publishedAt = snapshot.publishedAt;
    this._providerCapability = snapshot.providerCapability;
    this._externalUrl = snapshot.externalUrl;
  }

  static create(props: CreatePublishedContentProps, clock: Clock): PublishedContent {
    const now = clock.now();
    const published = new PublishedContent({
      id: props.id,
      tenantId: props.tenantId,
      draftId: props.draftId,
      opportunityId: props.opportunityId,
      slug: props.slug,
      title: props.title,
      body: props.body,
      viewCount: 0,
      publishedAt: now,
      providerCapability: props.providerCapability,
      externalUrl: props.externalUrl,
    });
    published.raise({
      ...published.eventEnvelope(now),
      eventType: CONTENT_PUBLISHED,
      payload: {
        publishedContentId: props.id.value(),
        draftId: props.draftId,
        opportunityId: props.opportunityId,
        slug: props.slug.value,
      },
    });
    return published;
  }

  static reconstitute(snapshot: PublishedContentSnapshot): PublishedContent {
    return new PublishedContent(snapshot);
  }

  /** Record one more view. Not raised as a domain event — far too high frequency. */
  recordView(): void {
    this._viewCount += 1;
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get draftId(): UUID {
    return this._draftId;
  }

  get opportunityId(): UUID {
    return this._opportunityId;
  }

  get slug(): PublishedSlug {
    return this._slug;
  }

  get title(): ContentTitle {
    return this._title;
  }

  get body(): ContentBody {
    return this._body;
  }

  get viewCount(): number {
    return this._viewCount;
  }

  get publishedAt(): IsoTimestamp {
    return this._publishedAt;
  }

  get providerCapability(): string {
    return this._providerCapability;
  }

  get externalUrl(): string {
    return this._externalUrl;
  }

  private raise(event: AnyOpportunityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: PublishedContentId;
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
