import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import {
  OPPORTUNITY_DISMISSED,
  OPPORTUNITY_DRAFTED,
  OPPORTUNITY_EVENT_SCHEMA_VERSION,
  OPPORTUNITY_PROPOSED,
  OPPORTUNITY_PUBLISHED,
} from '../events/opportunity-events.js';
import type { AnyOpportunityEvent } from '../events/opportunity-events.js';
import { OpportunityStatus } from '../value-objects/opportunity-status.js';
import type { OpportunityRationale } from '../value-objects/opportunity-rationale.js';
import type { OpportunityTitle } from '../value-objects/opportunity-title.js';
import type { OpportunityType } from '../value-objects/opportunity-type.js';
import type { OpportunityId } from '../value-objects/opportunity-ids.js';

/** What callers provide to create a new opportunity. */
export interface CreateOpportunityProps {
  readonly id: OpportunityId;
  readonly tenantId: TenantId;
  readonly insightId: UUID;
  readonly title: OpportunityTitle;
  readonly rationale: OpportunityRationale;
  readonly type: OpportunityType;
}

/** Full state needed to rehydrate an existing opportunity (no events are raised). */
export interface OpportunitySnapshot {
  readonly id: OpportunityId;
  readonly tenantId: TenantId;
  readonly insightId: UUID;
  readonly title: OpportunityTitle;
  readonly rationale: OpportunityRationale;
  readonly type: OpportunityType;
  readonly status: OpportunityStatus;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * The heart of Wisdum (Product Bible §8): a proposed valuable thing the
 * user could create next, derived from an Insight. Lifecycle mirrors the
 * Core Loop's Create/Publish steps: proposed -> drafted -> published, with
 * `dismissed` as a terminal escape hatch from either non-terminal state.
 */
export class Opportunity extends AggregateRoot<OpportunityId> {
  private readonly _tenantId: TenantId;
  private readonly _insightId: UUID;
  private readonly _title: OpportunityTitle;
  private readonly _rationale: OpportunityRationale;
  private readonly _type: OpportunityType;
  private _status: OpportunityStatus;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: OpportunitySnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._insightId = snapshot.insightId;
    this._title = snapshot.title;
    this._rationale = snapshot.rationale;
    this._type = snapshot.type;
    this._status = snapshot.status;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  static create(props: CreateOpportunityProps, clock: Clock): Opportunity {
    const now = clock.now();
    const opportunity = new Opportunity({
      id: props.id,
      tenantId: props.tenantId,
      insightId: props.insightId,
      title: props.title,
      rationale: props.rationale,
      type: props.type,
      status: OpportunityStatus.proposed(),
      createdAt: now,
      updatedAt: now,
    });
    opportunity.raise({
      ...opportunity.eventEnvelope(now),
      eventType: OPPORTUNITY_PROPOSED,
      payload: {
        opportunityId: props.id.value(),
        insightId: props.insightId,
        type: props.type.value,
      },
    });
    return opportunity;
  }

  static reconstitute(snapshot: OpportunitySnapshot): Opportunity {
    return new Opportunity(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Record that a content draft now exists for this opportunity (Create step). */
  markDrafted(contentDraftId: UUID, clock: Clock): void {
    const now = clock.now();
    this.transitionTo(OpportunityStatus.drafted(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: OPPORTUNITY_DRAFTED,
      payload: { opportunityId: this.id.value(), contentDraftId },
    });
  }

  /** Record that this opportunity's content has been published (Publish step). */
  markPublished(publishedContentId: UUID, clock: Clock): void {
    const now = clock.now();
    this.transitionTo(OpportunityStatus.published(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: OPPORTUNITY_PUBLISHED,
      payload: { opportunityId: this.id.value(), publishedContentId },
    });
  }

  dismiss(clock: Clock): void {
    const now = clock.now();
    const previousStatus = this._status.value;
    this.transitionTo(OpportunityStatus.dismissed(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: OPPORTUNITY_DISMISSED,
      payload: { opportunityId: this.id.value(), previousStatus },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get insightId(): UUID {
    return this._insightId;
  }

  get title(): OpportunityTitle {
    return this._title;
  }

  get rationale(): OpportunityRationale {
    return this._rationale;
  }

  get type(): OpportunityType {
    return this._type;
  }

  get status(): OpportunityStatus {
    return this._status;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  // ── Invariant enforcement ──────────────────────────────────────────────

  private transitionTo(next: OpportunityStatus, now: IsoTimestamp): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Opportunity cannot transition from '${this._status.value}' to '${next.value}'`,
        { opportunityId: this.id.value(), from: this._status.value, to: next.value },
      );
    }
    this._status = next;
    this._updatedAt = now;
  }

  private raise(event: AnyOpportunityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: OpportunityId;
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
