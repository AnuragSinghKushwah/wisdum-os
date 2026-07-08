import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { ConceptDescription } from '../value-objects/concept-description.js';
import type { ConceptId } from '../value-objects/graph-ids.js';
import type { ConceptName } from '../value-objects/concept-name.js';
import { CONCEPT_CREATED, GRAPH_EVENT_SCHEMA_VERSION } from '../events/graph-events.js';
import type { AnyGraphEvent } from '../events/graph-events.js';

/** What callers provide to create a new concept. */
export interface CreateConceptProps {
  readonly id: ConceptId;
  readonly tenantId: TenantId;
  readonly name: ConceptName;
  readonly description?: ConceptDescription;
}

/** Full state needed to rehydrate an existing concept (no events are raised). */
export interface ConceptSnapshot {
  readonly id: ConceptId;
  readonly tenantId: TenantId;
  readonly name: ConceptName;
  readonly description: ConceptDescription;
  readonly mentionCount: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * A node in the knowledge graph (Product Bible §7, §15): a distinct idea or
 * topic, deduplicated per tenant by normalized name. `mentionCount` is the
 * simplest possible "pattern" signal — a concept mentioned across several
 * knowledge assets is a candidate for reasoning, with no separate Pattern
 * entity required.
 */
export class Concept extends AggregateRoot<ConceptId> {
  private readonly _tenantId: TenantId;
  private readonly _name: ConceptName;
  private _description: ConceptDescription;
  private _mentionCount: number;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: ConceptSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._name = snapshot.name;
    this._description = snapshot.description;
    this._mentionCount = snapshot.mentionCount;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  static create(props: CreateConceptProps, clock: Clock): Concept {
    const now = clock.now();
    const concept = new Concept({
      id: props.id,
      tenantId: props.tenantId,
      name: props.name,
      description: props.description ?? ConceptDescription.empty(),
      mentionCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    concept.raise({
      ...concept.eventEnvelope(now),
      eventType: CONCEPT_CREATED,
      payload: { conceptId: props.id.value(), name: props.name.value },
    });
    return concept;
  }

  /** Rehydrate an existing concept from persisted state. Raises no events. */
  static reconstitute(snapshot: ConceptSnapshot): Concept {
    return new Concept(snapshot);
  }

  /** Record that this concept was mentioned in one more knowledge asset. */
  recordMention(clock: Clock): void {
    this._mentionCount += 1;
    this._updatedAt = clock.now();
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): ConceptName {
    return this._name;
  }

  get description(): ConceptDescription {
    return this._description;
  }

  get mentionCount(): number {
    return this._mentionCount;
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
    aggregateId: ConceptId;
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
