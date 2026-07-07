import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { InvariantViolationError, ValidationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { SearchDocument } from '../value-objects/search-document.js';
import { SearchRanking } from '../value-objects/search-ranking.js';
import type {
  SearchIndexStatusValue,
  SearchMode,
  SearchSourceType,
} from '../types/search-types.js';
import type { SearchIndexId } from '../value-objects/search-index-id.js';
import {
  SEARCH_DOCUMENT_FAILED,
  SEARCH_DOCUMENT_INDEXED,
  SEARCH_DOCUMENT_REMOVED,
  SEARCH_EVENT_SCHEMA_VERSION,
  SEARCH_INDEX_CREATED,
  SEARCH_INDEX_DELETED,
  SEARCH_INDEX_RANKING_CHANGED,
  SEARCH_INDEX_REBUILD_COMPLETED,
  SEARCH_INDEX_REBUILD_STARTED,
} from '../events/search-events.js';
import type { AnySearchEvent } from '../events/search-events.js';

const INDEX_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 80;

/** What callers provide to create a search index. */
export interface CreateSearchIndexProps {
  readonly id: SearchIndexId;
  readonly tenantId: TenantId;
  /** Lowercase kebab-case, unique per tenant (e.g. `knowledge-main`). */
  readonly name: string;
  readonly mode: SearchMode;
  readonly ranking?: SearchRanking;
}

/** Full state needed to rehydrate a search index (no events are raised). */
export interface SearchIndexSnapshot {
  readonly id: SearchIndexId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly mode: SearchMode;
  readonly ranking: SearchRanking;
  readonly status: SearchIndexStatusValue;
  readonly documents: readonly SearchDocument[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Aggregate root of the Search bounded context: one logical index over
 * tenant content. The aggregate tracks index membership, ranking policy,
 * and rebuild lifecycle — the physical index and query execution live in
 * the search runtime behind provider interfaces.
 */
export class SearchIndex extends AggregateRoot<SearchIndexId> {
  private readonly _tenantId: TenantId;
  private readonly _name: string;
  private readonly _mode: SearchMode;
  private _ranking: SearchRanking;
  private _status: SearchIndexStatusValue;
  private _documents: Map<UUID, SearchDocument>;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: SearchIndexSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._name = snapshot.name;
    this._mode = snapshot.mode;
    this._ranking = snapshot.ranking;
    this._status = snapshot.status;
    this._documents = new Map(snapshot.documents.map((document) => [document.sourceId, document]));
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Create a new active index and raise SearchIndexCreated. */
  static create(props: CreateSearchIndexProps, clock: Clock): SearchIndex {
    const name = props.name.trim().toLowerCase();
    if (name.length === 0 || name.length > MAX_NAME_LENGTH || !INDEX_NAME_PATTERN.test(name)) {
      throw new ValidationError('Search index name must be lowercase kebab-case', {
        name: props.name,
      });
    }
    const now = clock.now();
    const index = new SearchIndex({
      id: props.id,
      tenantId: props.tenantId,
      name,
      mode: props.mode,
      ranking: props.ranking ?? SearchRanking.balanced(),
      status: 'active',
      documents: [],
      createdAt: now,
      updatedAt: now,
    });
    index.raise({
      ...index.eventEnvelope(now),
      eventType: SEARCH_INDEX_CREATED,
      payload: { searchIndexId: props.id.value(), name, mode: props.mode },
    });
    return index;
  }

  /** Rehydrate an existing index from persisted state. Raises no events. */
  static reconstitute(snapshot: SearchIndexSnapshot): SearchIndex {
    return new SearchIndex(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Record a successful indexing pass for a source. */
  recordDocumentIndexed(
    props: { sourceId: UUID; sourceType: SearchSourceType; chunkCount: number },
    clock: Clock,
  ): void {
    this.ensureNotDeleted();
    const now = clock.now();
    const existing = this._documents.get(props.sourceId);
    const document =
      existing?.indexed(now, props.chunkCount) ??
      SearchDocument.create({
        sourceId: props.sourceId,
        sourceType: props.sourceType,
        state: 'indexed',
        indexedAt: now,
        chunkCount: props.chunkCount,
      });
    this._documents.set(props.sourceId, document);
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SEARCH_DOCUMENT_INDEXED,
      payload: {
        searchIndexId: this.id.value(),
        sourceId: props.sourceId,
        sourceType: props.sourceType,
        chunkCount: props.chunkCount,
      },
    });
  }

  /** Record a failed indexing pass for a source. */
  recordDocumentFailed(
    props: { sourceId: UUID; sourceType: SearchSourceType },
    clock: Clock,
  ): void {
    this.ensureNotDeleted();
    const now = clock.now();
    const existing = this._documents.get(props.sourceId);
    const document =
      existing?.failed(now) ??
      SearchDocument.create({
        sourceId: props.sourceId,
        sourceType: props.sourceType,
        state: 'failed',
        indexedAt: now,
      });
    this._documents.set(props.sourceId, document);
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SEARCH_DOCUMENT_FAILED,
      payload: {
        searchIndexId: this.id.value(),
        sourceId: props.sourceId,
        sourceType: props.sourceType,
      },
    });
  }

  /** Remove a source from the index. Idempotent. */
  removeDocument(sourceId: UUID, clock: Clock): void {
    this.ensureNotDeleted();
    if (!this._documents.has(sourceId)) return;
    const now = clock.now();
    this._documents.delete(sourceId);
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SEARCH_DOCUMENT_REMOVED,
      payload: { searchIndexId: this.id.value(), sourceId },
    });
  }

  changeRanking(ranking: SearchRanking, clock: Clock): void {
    this.ensureNotDeleted();
    if (this._ranking.equals(ranking)) return;
    const now = clock.now();
    this._ranking = ranking;
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SEARCH_INDEX_RANKING_CHANGED,
      payload: {
        searchIndexId: this.id.value(),
        keywordWeight: ranking.keywordWeight,
        semanticWeight: ranking.semanticWeight,
        recencyWeight: ranking.recencyWeight,
      },
    });
  }

  /** Begin a full rebuild; membership is cleared and repopulated by the indexer. */
  startRebuild(clock: Clock): void {
    this.ensureNotDeleted();
    if (this._status === 'rebuilding') {
      throw new InvariantViolationError('Search index is already rebuilding', {
        searchIndexId: this.id.value(),
      });
    }
    const now = clock.now();
    this._status = 'rebuilding';
    this._documents = new Map();
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SEARCH_INDEX_REBUILD_STARTED,
      payload: { searchIndexId: this.id.value() },
    });
  }

  completeRebuild(clock: Clock): void {
    if (this._status !== 'rebuilding') {
      throw new InvariantViolationError('Search index is not rebuilding', {
        searchIndexId: this.id.value(),
        status: this._status,
      });
    }
    const now = clock.now();
    this._status = 'active';
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SEARCH_INDEX_REBUILD_COMPLETED,
      payload: { searchIndexId: this.id.value(), documentCount: this._documents.size },
    });
  }

  markDeleted(clock: Clock): void {
    if (this._status === 'deleted') return;
    const now = clock.now();
    this._status = 'deleted';
    this._documents = new Map();
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SEARCH_INDEX_DELETED,
      payload: { searchIndexId: this.id.value() },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): string {
    return this._name;
  }

  get mode(): SearchMode {
    return this._mode;
  }

  get ranking(): SearchRanking {
    return this._ranking;
  }

  get status(): SearchIndexStatusValue {
    return this._status;
  }

  get documents(): readonly SearchDocument[] {
    return Object.freeze([...this._documents.values()]);
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  documentCount(): number {
    return this._documents.size;
  }

  containsSource(sourceId: UUID): boolean {
    return this._documents.has(sourceId);
  }

  isReady(): boolean {
    return this._status === 'active';
  }

  private ensureNotDeleted(): void {
    if (this._status === 'deleted') {
      throw new InvariantViolationError('A deleted search index cannot be modified', {
        searchIndexId: this.id.value(),
      });
    }
  }

  private raise(event: AnySearchEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: SearchIndexId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: SEARCH_EVENT_SCHEMA_VERSION,
    };
  }
}
