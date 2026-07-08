import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { INSIGHT_GENERATED, OPPORTUNITY_EVENT_SCHEMA_VERSION } from '../events/opportunity-events.js';
import type { AnyOpportunityEvent } from '../events/opportunity-events.js';
import type { InsightSummary } from '../value-objects/insight-summary.js';
import type { InsightId } from '../value-objects/opportunity-ids.js';

/** What callers provide to create a new insight. */
export interface CreateInsightProps {
  readonly id: InsightId;
  readonly tenantId: TenantId;
  readonly summary: InsightSummary;
  /** Referenced by primitive id — Insight does not depend on the graph bounded context. */
  readonly conceptIds: readonly UUID[];
  readonly sourceKnowledgeIds: readonly UUID[];
}

/** Full state needed to rehydrate an existing insight (no events are raised). */
export interface InsightSnapshot {
  readonly id: InsightId;
  readonly tenantId: TenantId;
  readonly summary: InsightSummary;
  readonly conceptIds: readonly UUID[];
  readonly sourceKnowledgeIds: readonly UUID[];
  readonly createdAt: IsoTimestamp;
}

/**
 * A reasoning conclusion (Product Bible §7, "Reason -> Insight"): a pattern
 * observed across one or more knowledge assets, referencing the concepts
 * and source assets it was derived from. Immutable once generated —
 * Insights are facts about a past reasoning pass, not editable records.
 */
export class Insight extends AggregateRoot<InsightId> {
  private readonly _tenantId: TenantId;
  private readonly _summary: InsightSummary;
  private readonly _conceptIds: readonly UUID[];
  private readonly _sourceKnowledgeIds: readonly UUID[];
  private readonly _createdAt: IsoTimestamp;

  private constructor(snapshot: InsightSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._summary = snapshot.summary;
    this._conceptIds = snapshot.conceptIds;
    this._sourceKnowledgeIds = snapshot.sourceKnowledgeIds;
    this._createdAt = snapshot.createdAt;
  }

  static create(props: CreateInsightProps, clock: Clock): Insight {
    const now = clock.now();
    const insight = new Insight({
      id: props.id,
      tenantId: props.tenantId,
      summary: props.summary,
      conceptIds: props.conceptIds,
      sourceKnowledgeIds: props.sourceKnowledgeIds,
      createdAt: now,
    });
    insight.raise({
      ...insight.eventEnvelope(now),
      eventType: INSIGHT_GENERATED,
      payload: {
        insightId: props.id.value(),
        conceptIds: props.conceptIds,
        sourceKnowledgeIds: props.sourceKnowledgeIds,
      },
    });
    return insight;
  }

  static reconstitute(snapshot: InsightSnapshot): Insight {
    return new Insight(snapshot);
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get summary(): InsightSummary {
    return this._summary;
  }

  get conceptIds(): readonly UUID[] {
    return this._conceptIds;
  }

  get sourceKnowledgeIds(): readonly UUID[] {
    return this._sourceKnowledgeIds;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  private raise(event: AnyOpportunityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: InsightId;
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
