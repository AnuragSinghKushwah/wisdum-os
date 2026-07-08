import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import {
  CONCEPT_RELATIONSHIP_DETECTED,
  GRAPH_EVENT_SCHEMA_VERSION,
} from '../events/graph-events.js';
import type { AnyGraphEvent } from '../events/graph-events.js';
import type { ConceptId, ConceptRelationshipId } from '../value-objects/graph-ids.js';
import type { ConceptRelationshipType } from '../value-objects/concept-relationship-type.js';

/** What callers provide to create a new relationship. */
export interface CreateConceptRelationshipProps {
  readonly id: ConceptRelationshipId;
  readonly tenantId: TenantId;
  readonly conceptAId: ConceptId;
  readonly conceptBId: ConceptId;
  readonly relationshipType: ConceptRelationshipType;
}

/** Full state needed to rehydrate an existing relationship (no events are raised). */
export interface ConceptRelationshipSnapshot {
  readonly id: ConceptRelationshipId;
  readonly tenantId: TenantId;
  readonly conceptAId: ConceptId;
  readonly conceptBId: ConceptId;
  readonly relationshipType: ConceptRelationshipType;
  readonly occurrenceCount: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * An edge between two Concepts. `occurrenceCount` — how many knowledge
 * assets mention both concepts together — is the "Pattern" signal from
 * Product Bible §7: a relationship crossing an occurrence threshold is a
 * pattern worth reasoning about, without a separate Pattern entity.
 */
export class ConceptRelationship extends AggregateRoot<ConceptRelationshipId> {
  private readonly _tenantId: TenantId;
  private readonly _conceptAId: ConceptId;
  private readonly _conceptBId: ConceptId;
  private readonly _relationshipType: ConceptRelationshipType;
  private _occurrenceCount: number;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: ConceptRelationshipSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._conceptAId = snapshot.conceptAId;
    this._conceptBId = snapshot.conceptBId;
    this._relationshipType = snapshot.relationshipType;
    this._occurrenceCount = snapshot.occurrenceCount;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  static create(props: CreateConceptRelationshipProps, clock: Clock): ConceptRelationship {
    const now = clock.now();
    const relationship = new ConceptRelationship({
      id: props.id,
      tenantId: props.tenantId,
      conceptAId: props.conceptAId,
      conceptBId: props.conceptBId,
      relationshipType: props.relationshipType,
      occurrenceCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    relationship.raise({
      ...relationship.eventEnvelope(now),
      eventType: CONCEPT_RELATIONSHIP_DETECTED,
      payload: {
        conceptRelationshipId: props.id.value(),
        conceptAId: props.conceptAId.value(),
        conceptBId: props.conceptBId.value(),
        relationshipType: props.relationshipType.value,
      },
    });
    return relationship;
  }

  static reconstitute(snapshot: ConceptRelationshipSnapshot): ConceptRelationship {
    return new ConceptRelationship(snapshot);
  }

  /** Record one more knowledge asset mentioning both concepts together. */
  recordOccurrence(clock: Clock): void {
    this._occurrenceCount += 1;
    this._updatedAt = clock.now();
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get conceptAId(): ConceptId {
    return this._conceptAId;
  }

  get conceptBId(): ConceptId {
    return this._conceptBId;
  }

  get relationshipType(): ConceptRelationshipType {
    return this._relationshipType;
  }

  get occurrenceCount(): number {
    return this._occurrenceCount;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  private raise(event: AnyGraphEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: ConceptRelationshipId;
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
