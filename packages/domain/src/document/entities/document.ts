import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { ByteSize } from '../value-objects/byte-size.js';
import { DocumentStatus } from '../value-objects/document-status.js';
import { LanguageCode } from '../value-objects/language-code.js';
import type { ContentEncoding } from '../value-objects/content-encoding.js';
import type { ContentHash } from '../value-objects/content-hash.js';
import type { DocumentContent } from '../value-objects/document-content.js';
import type { DocumentId } from '../value-objects/document-id.js';
import type { MimeType } from '../value-objects/mime-type.js';
import {
  DOCUMENT_CONTENT_REPLACED,
  DOCUMENT_CREATED,
  DOCUMENT_DELETED,
  DOCUMENT_EVENT_SCHEMA_VERSION,
  DOCUMENT_LANGUAGE_DETECTED,
  DOCUMENT_SUPERSEDED,
} from '../events/document-events.js';
import type { AnyDocumentEvent } from '../events/document-events.js';

/** What callers provide to create a new document. */
export interface CreateDocumentProps {
  readonly id: DocumentId;
  readonly tenantId: TenantId;
  readonly content: DocumentContent;
  readonly mimeType: MimeType;
  readonly encoding: ContentEncoding;
  readonly sizeBytes: ByteSize;
  readonly contentHash: ContentHash;
  readonly language?: LanguageCode;
}

/** Full state needed to rehydrate an existing document (no events are raised). */
export interface DocumentSnapshot {
  readonly id: DocumentId;
  readonly tenantId: TenantId;
  readonly content: DocumentContent;
  readonly mimeType: MimeType;
  readonly language: LanguageCode;
  readonly encoding: ContentEncoding;
  readonly sizeBytes: ByteSize;
  readonly contentHash: ContentHash;
  readonly status: DocumentStatus;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Aggregate root of the Document bounded context: the raw content record
 * behind a knowledge asset. A document owns its content, MIME type,
 * language, encoding, size, and content hash — and nothing else.
 * Permissions, labels, visibility, embeddings, and processing state belong
 * to other contexts and must never leak in here.
 *
 * Content is replaced wholesale (documents are immutable revisions of
 * bytes, not editable buffers); hash and size always change together with
 * the content.
 */
export class Document extends AggregateRoot<DocumentId> {
  private readonly _tenantId: TenantId;
  private _content: DocumentContent;
  private readonly _mimeType: MimeType;
  private _language: LanguageCode;
  private _encoding: ContentEncoding;
  private _sizeBytes: ByteSize;
  private _contentHash: ContentHash;
  private _status: DocumentStatus;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: DocumentSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._content = snapshot.content;
    this._mimeType = snapshot.mimeType;
    this._language = snapshot.language;
    this._encoding = snapshot.encoding;
    this._sizeBytes = snapshot.sizeBytes;
    this._contentHash = snapshot.contentHash;
    this._status = snapshot.status;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Create a new active document and raise DocumentCreated. */
  static create(props: CreateDocumentProps, clock: Clock): Document {
    if (props.content.isEmpty() && !props.sizeBytes.isEmpty()) {
      throw new InvariantViolationError('Empty content cannot report a non-zero size', {
        documentId: props.id.value(),
        sizeBytes: props.sizeBytes.value,
      });
    }
    const now = clock.now();
    const document = new Document({
      id: props.id,
      tenantId: props.tenantId,
      content: props.content,
      mimeType: props.mimeType,
      language: props.language ?? LanguageCode.undetermined(),
      encoding: props.encoding,
      sizeBytes: props.sizeBytes,
      contentHash: props.contentHash,
      status: DocumentStatus.active(),
      createdAt: now,
      updatedAt: now,
    });
    document.raise({
      ...document.eventEnvelope(now),
      eventType: DOCUMENT_CREATED,
      payload: {
        documentId: props.id.value(),
        mimeType: document._mimeType.value,
        language: document._language.value,
        encoding: document._encoding.value,
        sizeBytes: document._sizeBytes.value,
        contentHash: document._contentHash.toString(),
      },
    });
    return document;
  }

  /** Rehydrate an existing document from persisted state. Raises no events. */
  static reconstitute(snapshot: DocumentSnapshot): Document {
    return new Document(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /**
   * Replace the content wholesale. Hash, size, and encoding travel with the
   * content — they can never drift apart.
   */
  replaceContent(
    props: {
      readonly content: DocumentContent;
      readonly contentHash: ContentHash;
      readonly sizeBytes: ByteSize;
      readonly encoding: ContentEncoding;
    },
    clock: Clock,
  ): void {
    this.ensureMutable();
    if (this._contentHash.equals(props.contentHash)) return;
    const now = clock.now();
    const previousHash = this._contentHash;
    this._content = props.content;
    this._contentHash = props.contentHash;
    this._sizeBytes = props.sizeBytes;
    this._encoding = props.encoding;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: DOCUMENT_CONTENT_REPLACED,
      payload: {
        documentId: this.id.value(),
        previousHash: previousHash.toString(),
        contentHash: props.contentHash.toString(),
        sizeBytes: props.sizeBytes.value,
        encoding: props.encoding.value,
      },
    });
  }

  /** Record the detected natural language of the content. */
  detectLanguage(language: LanguageCode, clock: Clock): void {
    this.ensureMutable();
    if (this._language.equals(language)) return;
    const now = clock.now();
    const from = this._language;
    this._language = language;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: DOCUMENT_LANGUAGE_DETECTED,
      payload: { documentId: this.id.value(), from: from.value, to: language.value },
    });
  }

  /** Mark this revision as replaced by a newer document. */
  supersede(supersededBy: DocumentId, clock: Clock): void {
    if (supersededBy.equals(this.id)) {
      throw new InvariantViolationError('A document cannot supersede itself', {
        documentId: this.id.value(),
      });
    }
    const now = clock.now();
    this.transitionTo(DocumentStatus.superseded(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: DOCUMENT_SUPERSEDED,
      payload: { documentId: this.id.value(), supersededBy: supersededBy.value() },
    });
  }

  markDeleted(clock: Clock): void {
    if (this._status.is('deleted')) return;
    const now = clock.now();
    const previousStatus = this._status.value;
    this.transitionTo(DocumentStatus.deleted(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: DOCUMENT_DELETED,
      payload: { documentId: this.id.value(), previousStatus },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get content(): DocumentContent {
    return this._content;
  }

  get mimeType(): MimeType {
    return this._mimeType;
  }

  get language(): LanguageCode {
    return this._language;
  }

  get encoding(): ContentEncoding {
    return this._encoding;
  }

  get sizeBytes(): ByteSize {
    return this._sizeBytes;
  }

  get contentHash(): ContentHash {
    return this._contentHash;
  }

  get status(): DocumentStatus {
    return this._status;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  // ── Invariant enforcement ──────────────────────────────────────────────

  /** Only the live revision can change; superseded and deleted documents are frozen. */
  private ensureMutable(): void {
    if (!this._status.is('active')) {
      throw new InvariantViolationError(`A ${this._status.value} document cannot be modified`, {
        documentId: this.id.value(),
        status: this._status.value,
      });
    }
  }

  private transitionTo(next: DocumentStatus, now: IsoTimestamp): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Document cannot transition from '${this._status.value}' to '${next.value}'`,
        { documentId: this.id.value(), from: this._status.value, to: next.value },
      );
    }
    this._status = next;
    this.touch(now);
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyDocumentEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: DocumentId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: DOCUMENT_EVENT_SCHEMA_VERSION,
    };
  }
}
