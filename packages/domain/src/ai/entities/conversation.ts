import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { TokenUsage } from '../value-objects/token-usage.js';
import type { ConversationStatusValue } from '../types/ai-types.js';
import type { ConversationId } from '../value-objects/ai-ids.js';
import type { ConversationMessage } from '../value-objects/conversation-message.js';
import type { ModelReference } from '../value-objects/model-reference.js';
import {
  AI_EVENT_SCHEMA_VERSION,
  CONVERSATION_ARCHIVED,
  CONVERSATION_MESSAGE_APPENDED,
  CONVERSATION_STARTED,
} from '../events/ai-events.js';
import type { AnyAIEvent } from '../events/ai-events.js';

/** What callers provide to start a conversation. */
export interface StartConversationProps {
  readonly id: ConversationId;
  readonly tenantId: TenantId;
  readonly model: ModelReference;
  /** The user or service account the conversation belongs to. */
  readonly ownerId: UUID;
  readonly title?: string;
}

/** Full state needed to rehydrate a conversation (no events are raised). */
export interface ConversationSnapshot {
  readonly id: ConversationId;
  readonly tenantId: TenantId;
  readonly model: ModelReference;
  readonly ownerId: UUID;
  readonly title?: string;
  readonly status: ConversationStatusValue;
  readonly messages: readonly ConversationMessage[];
  readonly totalUsage: TokenUsage;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * An append-only AI conversation transcript with accumulated token usage.
 * The domain records what was said and spent; invoking models and running
 * tools is the AI runtime's job. Archived conversations are frozen.
 */
export class Conversation extends AggregateRoot<ConversationId> {
  private readonly _tenantId: TenantId;
  private readonly _model: ModelReference;
  private readonly _ownerId: UUID;
  private _title?: string;
  private _status: ConversationStatusValue;
  private readonly _messages: ConversationMessage[];
  private _totalUsage: TokenUsage;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: ConversationSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._model = snapshot.model;
    this._ownerId = snapshot.ownerId;
    this._title = snapshot.title;
    this._status = snapshot.status;
    this._messages = [...snapshot.messages];
    this._totalUsage = snapshot.totalUsage;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Start a new conversation and raise ConversationStarted. */
  static start(props: StartConversationProps, clock: Clock): Conversation {
    const now = clock.now();
    const conversation = new Conversation({
      id: props.id,
      tenantId: props.tenantId,
      model: props.model,
      ownerId: props.ownerId,
      title: props.title,
      status: 'active',
      messages: [],
      totalUsage: TokenUsage.zero(),
      createdAt: now,
      updatedAt: now,
    });
    conversation.raise({
      ...conversation.eventEnvelope(now),
      eventType: CONVERSATION_STARTED,
      payload: { conversationId: props.id.value(), model: props.model.toString() },
    });
    return conversation;
  }

  /** Rehydrate an existing conversation from persisted state. Raises no events. */
  static reconstitute(snapshot: ConversationSnapshot): Conversation {
    return new Conversation(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Append a turn to the transcript, accumulating its token usage. */
  appendMessage(message: ConversationMessage, clock: Clock): void {
    this.ensureActive();
    const now = clock.now();
    this._messages.push(message);
    const usage = message.usage ?? TokenUsage.zero();
    this._totalUsage = this._totalUsage.add(usage);
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: CONVERSATION_MESSAGE_APPENDED,
      payload: {
        conversationId: this.id.value(),
        role: message.role,
        messageIndex: this._messages.length - 1,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    });
  }

  retitle(title: string, clock: Clock): void {
    this.ensureActive();
    if (this._title === title) return;
    this._title = title;
    this._updatedAt = clock.now();
  }

  archive(clock: Clock): void {
    if (this._status === 'archived') return;
    const now = clock.now();
    this._status = 'archived';
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: CONVERSATION_ARCHIVED,
      payload: { conversationId: this.id.value() },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get model(): ModelReference {
    return this._model;
  }

  get ownerId(): UUID {
    return this._ownerId;
  }

  get title(): string | undefined {
    return this._title;
  }

  get status(): ConversationStatusValue {
    return this._status;
  }

  get messages(): readonly ConversationMessage[] {
    return Object.freeze([...this._messages]);
  }

  get totalUsage(): TokenUsage {
    return this._totalUsage;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  messageCount(): number {
    return this._messages.length;
  }

  /** Tool calls awaiting execution across the transcript. */
  hasPendingToolCalls(): boolean {
    return this._messages.some((message) =>
      message.toolCalls.some((toolCall) => toolCall.isPending()),
    );
  }

  private ensureActive(): void {
    if (this._status !== 'active') {
      throw new InvariantViolationError('An archived conversation cannot be modified', {
        conversationId: this.id.value(),
      });
    }
  }

  private raise(event: AnyAIEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: ConversationId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: AI_EVENT_SCHEMA_VERSION,
    };
  }
}
