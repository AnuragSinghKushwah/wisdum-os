import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { KnowledgeDescription } from '../value-objects/knowledge-description.js';
import { KnowledgeStatus } from '../value-objects/knowledge-status.js';
import { KnowledgeVersion } from '../value-objects/knowledge-version.js';
import type { ContentReference } from '../value-objects/content-reference.js';
import type { KnowledgeId } from '../value-objects/knowledge-id.js';
import type { KnowledgeLabel } from '../value-objects/knowledge-label.js';
import type { KnowledgeSlug } from '../value-objects/knowledge-slug.js';
import type { KnowledgeSource } from '../value-objects/knowledge-source.js';
import type { KnowledgeTitle } from '../value-objects/knowledge-title.js';
import type { KnowledgeType } from '../value-objects/knowledge-type.js';
import type { KnowledgeVisibility } from '../value-objects/knowledge-visibility.js';
import type { KnowledgeProperties } from '../types/knowledge-types.js';
import {
  KNOWLEDGE_ARCHIVED,
  KNOWLEDGE_CREATED,
  KNOWLEDGE_DELETED,
  KNOWLEDGE_EVENT_SCHEMA_VERSION,
  KNOWLEDGE_IMPORTED,
  KNOWLEDGE_PROCESSING_COMPLETED,
  KNOWLEDGE_PROCESSING_STARTED,
  KNOWLEDGE_UPDATED,
  KNOWLEDGE_VISIBILITY_CHANGED,
} from '../events/knowledge-events.js';
import type { AnyKnowledgeEvent } from '../events/knowledge-events.js';

/** What callers provide to create a new knowledge asset. */
export interface CreateKnowledgeProps {
  readonly id: KnowledgeId;
  readonly tenantId: TenantId;
  readonly title: KnowledgeTitle;
  readonly slug: KnowledgeSlug;
  readonly type: KnowledgeType;
  readonly visibility: KnowledgeVisibility;
  readonly source: KnowledgeSource;
  readonly description?: KnowledgeDescription;
  readonly labels?: readonly KnowledgeLabel[];
  readonly properties?: KnowledgeProperties;
  readonly contentReferences?: readonly ContentReference[];
}

/** Full state needed to rehydrate an existing asset (no events are raised). */
export interface KnowledgeSnapshot {
  readonly id: KnowledgeId;
  readonly tenantId: TenantId;
  readonly title: KnowledgeTitle;
  readonly slug: KnowledgeSlug;
  readonly description: KnowledgeDescription;
  readonly type: KnowledgeType;
  readonly status: KnowledgeStatus;
  readonly visibility: KnowledgeVisibility;
  readonly source: KnowledgeSource;
  readonly version: KnowledgeVersion;
  readonly labels: readonly KnowledgeLabel[];
  readonly properties: KnowledgeProperties;
  readonly contentReferences: readonly ContentReference[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly processingStartedAt: IsoTimestamp | null;
  readonly processedAt: IsoTimestamp | null;
}

/**
 * Aggregate root of the Knowledge bounded context: the canonical record of a
 * single knowledge asset. Knowledge is NOT the document itself — content
 * lives behind content references; this aggregate owns the metadata, source,
 * processing state, version, labels, and properties, and enforces every
 * lifecycle invariant.
 *
 * All state transitions go through the KnowledgeStatus transition map, which
 * guarantees: archived assets never enter processing, deleted assets are
 * terminal, and processing cannot complete unless it was started.
 */
export class Knowledge extends AggregateRoot<KnowledgeId> {
  private readonly _tenantId: TenantId;
  private _title: KnowledgeTitle;
  private readonly _slug: KnowledgeSlug;
  private _description: KnowledgeDescription;
  private readonly _type: KnowledgeType;
  private _status: KnowledgeStatus;
  private _visibility: KnowledgeVisibility;
  private readonly _source: KnowledgeSource;
  private _version: KnowledgeVersion;
  private _labels: readonly KnowledgeLabel[];
  private readonly _properties: KnowledgeProperties;
  private _contentReferences: readonly ContentReference[];
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;
  private _processingStartedAt: IsoTimestamp | null;
  private _processedAt: IsoTimestamp | null;

  private constructor(snapshot: KnowledgeSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._title = snapshot.title;
    this._slug = snapshot.slug;
    this._description = snapshot.description;
    this._type = snapshot.type;
    this._status = snapshot.status;
    this._visibility = snapshot.visibility;
    this._source = snapshot.source;
    this._version = snapshot.version;
    this._labels = [...snapshot.labels];
    this._properties = { ...snapshot.properties };
    this._contentReferences = [...snapshot.contentReferences];
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
    this._processingStartedAt = snapshot.processingStartedAt;
    this._processedAt = snapshot.processedAt;
  }

  /** Create a new knowledge asset in draft status and raise KnowledgeCreated. */
  static create(props: CreateKnowledgeProps, clock: Clock): Knowledge {
    const now = clock.now();
    const knowledge = new Knowledge({
      id: props.id,
      tenantId: props.tenantId,
      title: props.title,
      slug: props.slug,
      description: props.description ?? KnowledgeDescription.empty(),
      type: props.type,
      status: KnowledgeStatus.draft(),
      visibility: props.visibility,
      source: props.source,
      version: KnowledgeVersion.initial(),
      labels: props.labels ?? [],
      properties: props.properties ?? {},
      contentReferences: props.contentReferences ?? [],
      createdAt: now,
      updatedAt: now,
      processingStartedAt: null,
      processedAt: null,
    });
    knowledge.raise({
      ...knowledge.eventEnvelope(now),
      eventType: KNOWLEDGE_CREATED,
      payload: {
        knowledgeId: props.id.value(),
        title: props.title.value,
        slug: props.slug.value,
        knowledgeType: props.type.value,
        visibility: props.visibility.value,
        sourceKind: props.source.kind,
      },
    });
    return knowledge;
  }

  /** Rehydrate an existing asset from persisted state. Raises no events. */
  static reconstitute(snapshot: KnowledgeSnapshot): Knowledge {
    return new Knowledge(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  rename(title: KnowledgeTitle, clock: Clock): void {
    this.ensureNotDeleted();
    if (this._title.equals(title)) return;
    const now = clock.now();
    const previous = this._title;
    this._title = title;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_UPDATED,
      payload: {
        knowledgeId: this.id.value(),
        change: 'title',
        detail: { from: previous.value, to: title.value },
      },
    });
  }

  updateDescription(description: KnowledgeDescription, clock: Clock): void {
    this.ensureNotDeleted();
    if (this._description.equals(description)) return;
    const now = clock.now();
    this._description = description;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_UPDATED,
      payload: { knowledgeId: this.id.value(), change: 'description', detail: {} },
    });
  }

  changeVisibility(visibility: KnowledgeVisibility, clock: Clock): void {
    this.ensureNotDeleted();
    if (this._visibility.equals(visibility)) return;
    const now = clock.now();
    const from = this._visibility;
    this._visibility = visibility;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_VISIBILITY_CHANGED,
      payload: { knowledgeId: this.id.value(), from: from.value, to: visibility.value },
    });
  }

  archive(clock: Clock): void {
    this.ensureNotDeleted();
    const now = clock.now();
    const previousStatus = this._status.value;
    this.transitionTo(KnowledgeStatus.archived(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_ARCHIVED,
      payload: { knowledgeId: this.id.value(), previousStatus },
    });
  }

  restore(clock: Clock): void {
    this.ensureNotDeleted();
    if (!this._status.is('archived')) {
      throw new InvariantViolationError('Only archived knowledge can be restored', {
        knowledgeId: this.id.value(),
        status: this._status.value,
      });
    }
    const now = clock.now();
    this.transitionTo(KnowledgeStatus.active(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_UPDATED,
      payload: { knowledgeId: this.id.value(), change: 'restored', detail: {} },
    });
  }

  beginImport(clock: Clock): void {
    this.ensureNotDeleted();
    const now = clock.now();
    this.transitionTo(KnowledgeStatus.importing(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_UPDATED,
      payload: { knowledgeId: this.id.value(), change: 'import-started', detail: {} },
    });
  }

  completeImport(contentReference: ContentReference, clock: Clock): void {
    this.ensureNotDeleted();
    if (!this._status.is('importing')) {
      throw new InvariantViolationError('Import cannot complete unless it has started', {
        knowledgeId: this.id.value(),
        status: this._status.value,
      });
    }
    const now = clock.now();
    this._contentReferences = [...this._contentReferences, contentReference];
    this.transitionTo(KnowledgeStatus.active(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_IMPORTED,
      payload: {
        knowledgeId: this.id.value(),
        sourceKind: this._source.kind,
        sourceUri: this._source.uri,
        contentReference: contentReference.reference,
      },
    });
  }

  startProcessing(clock: Clock): void {
    this.ensureNotDeleted();
    const now = clock.now();
    this.transitionTo(KnowledgeStatus.processing(), now);
    this._processingStartedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_PROCESSING_STARTED,
      payload: { knowledgeId: this.id.value(), startedAt: now },
    });
  }

  completeProcessing(clock: Clock): void {
    this.ensureNotDeleted();
    if (!this._status.is('processing')) {
      throw new InvariantViolationError('Processing cannot complete unless it has started', {
        knowledgeId: this.id.value(),
        status: this._status.value,
      });
    }
    const now = clock.now();
    this.transitionTo(KnowledgeStatus.active(), now);
    this._processedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_PROCESSING_COMPLETED,
      payload: {
        knowledgeId: this.id.value(),
        startedAt: this._processingStartedAt,
        completedAt: now,
      },
    });
  }

  markDeleted(clock: Clock): void {
    if (this._status.is('deleted')) return;
    const now = clock.now();
    const previousStatus = this._status.value;
    this.transitionTo(KnowledgeStatus.deleted(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_DELETED,
      payload: { knowledgeId: this.id.value(), previousStatus },
    });
  }

  addLabel(label: KnowledgeLabel, clock: Clock): void {
    this.ensureNotDeleted();
    if (this._labels.some((existing) => existing.equals(label))) return;
    const now = clock.now();
    this._labels = [...this._labels, label];
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_UPDATED,
      payload: {
        knowledgeId: this.id.value(),
        change: 'label-added',
        detail: { label: label.value },
      },
    });
  }

  removeLabel(label: KnowledgeLabel, clock: Clock): void {
    this.ensureNotDeleted();
    if (!this._labels.some((existing) => existing.equals(label))) return;
    const now = clock.now();
    this._labels = this._labels.filter((existing) => !existing.equals(label));
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_UPDATED,
      payload: {
        knowledgeId: this.id.value(),
        change: 'label-removed',
        detail: { label: label.value },
      },
    });
  }

  incrementVersion(clock: Clock): void {
    this.ensureNotDeleted();
    const now = clock.now();
    this._version = this._version.next();
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: KNOWLEDGE_UPDATED,
      payload: {
        knowledgeId: this.id.value(),
        change: 'version-incremented',
        detail: { version: String(this._version.value) },
      },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get title(): KnowledgeTitle {
    return this._title;
  }

  get slug(): KnowledgeSlug {
    return this._slug;
  }

  get description(): KnowledgeDescription {
    return this._description;
  }

  get type(): KnowledgeType {
    return this._type;
  }

  get status(): KnowledgeStatus {
    return this._status;
  }

  get visibility(): KnowledgeVisibility {
    return this._visibility;
  }

  get source(): KnowledgeSource {
    return this._source;
  }

  get version(): KnowledgeVersion {
    return this._version;
  }

  get labels(): readonly KnowledgeLabel[] {
    return this._labels;
  }

  get properties(): KnowledgeProperties {
    return this._properties;
  }

  updateProperty(key: string, value: string): void {
    (this._properties as Record<string, string>)[key] = value;
  }

  get contentReferences(): readonly ContentReference[] {
    return this._contentReferences;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  get processingStartedAt(): IsoTimestamp | null {
    return this._processingStartedAt;
  }

  get processedAt(): IsoTimestamp | null {
    return this._processedAt;
  }

  // ── Invariant enforcement ──────────────────────────────────────────────

  private ensureNotDeleted(): void {
    if (this._status.is('deleted')) {
      throw new InvariantViolationError('Deleted knowledge cannot be modified', {
        knowledgeId: this.id.value(),
      });
    }
  }

  private transitionTo(next: KnowledgeStatus, now: IsoTimestamp): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Knowledge cannot transition from '${this._status.value}' to '${next.value}'`,
        { knowledgeId: this.id.value(), from: this._status.value, to: next.value },
      );
    }
    this._status = next;
    this.touch(now);
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyKnowledgeEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: KnowledgeId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: KNOWLEDGE_EVENT_SCHEMA_VERSION,
    };
  }
}
