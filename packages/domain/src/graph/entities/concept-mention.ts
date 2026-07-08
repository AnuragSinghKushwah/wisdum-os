import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { CONCEPT_MENTIONED, GRAPH_EVENT_SCHEMA_VERSION } from '../events/graph-events.js';
import type { AnyGraphEvent } from '../events/graph-events.js';
import type { ConceptId, ConceptMentionId } from '../value-objects/graph-ids.js';

/** What callers provide to create a new mention. */
export interface CreateConceptMentionProps {
  readonly id: ConceptMentionId;
  readonly tenantId: TenantId;
  readonly conceptId: ConceptId;
  readonly knowledgeId: string;
}

/** Full state needed to rehydrate an existing mention (no events are raised). */
export interface ConceptMentionSnapshot {
  readonly id: ConceptMentionId;
  readonly tenantId: TenantId;
  readonly conceptId: ConceptId;
  readonly knowledgeId: string;
  readonly createdAt: IsoTimestamp;
}

/**
 * An edge linking a Knowledge asset to a Concept it mentions — the
 * "Connect" step of the Core Loop (Product Bible §5). Deliberately a thin
 * record: no behavior beyond existing, since the graph reasoning that
 * consumes it lives in the application-layer reasoning pipeline.
 */
export class ConceptMention extends AggregateRoot<ConceptMentionId> {
  private readonly _tenantId: TenantId;
  private readonly _conceptId: ConceptId;
  private readonly _knowledgeId: string;
  private readonly _createdAt: IsoTimestamp;

  private constructor(snapshot: ConceptMentionSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._conceptId = snapshot.conceptId;
    this._knowledgeId = snapshot.knowledgeId;
    this._createdAt = snapshot.createdAt;
  }

  static create(props: CreateConceptMentionProps, clock: Clock): ConceptMention {
    const now = clock.now();
    const mention = new ConceptMention({
      id: props.id,
      tenantId: props.tenantId,
      conceptId: props.conceptId,
      knowledgeId: props.knowledgeId,
      createdAt: now,
    });
    mention.raise({
      ...mention.eventEnvelope(now),
      eventType: CONCEPT_MENTIONED,
      payload: {
        conceptMentionId: props.id.value(),
        conceptId: props.conceptId.value(),
        knowledgeId: props.knowledgeId as UUID,
      },
    });
    return mention;
  }

  static reconstitute(snapshot: ConceptMentionSnapshot): ConceptMention {
    return new ConceptMention(snapshot);
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get conceptId(): ConceptId {
    return this._conceptId;
  }

  get knowledgeId(): string {
    return this._knowledgeId;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  private raise(event: AnyGraphEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: ConceptMentionId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: GRAPH_EVENT_SCHEMA_VERSION,
    };
  }
}
