import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { AIModelKind } from '../types/ai-types.js';
import type { AIModelId } from '../value-objects/ai-ids.js';
import type { ModelReference } from '../value-objects/model-reference.js';
import type { CompletionModel, EmbeddingModel } from '../value-objects/model-profiles.js';
import {
  AI_EVENT_SCHEMA_VERSION,
  AI_MODEL_DISABLED,
  AI_MODEL_ENABLED,
  AI_MODEL_REGISTERED,
} from '../events/ai-events.js';
import type { AnyAIEvent } from '../events/ai-events.js';

/** What callers provide to register a model in the catalog. */
export interface RegisterAIModelProps {
  readonly id: AIModelId;
  readonly tenantId: TenantId;
  readonly reference: ModelReference;
  readonly kind: AIModelKind;
  /** Required when kind is `completion`. */
  readonly completionProfile?: CompletionModel;
  /** Required when kind is `embedding`. */
  readonly embeddingProfile?: EmbeddingModel;
}

/** Full state needed to rehydrate an existing model (no events are raised). */
export interface AIModelSnapshot {
  readonly id: AIModelId;
  readonly tenantId: TenantId;
  readonly reference: ModelReference;
  readonly kind: AIModelKind;
  readonly completionProfile?: CompletionModel;
  readonly embeddingProfile?: EmbeddingModel;
  readonly enabled: boolean;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * A model in the tenant's catalog: a reference to a provider's model plus
 * the capability profile matching its kind. The catalog is what routing
 * and cost policies operate over — invocation happens in the AI runtime.
 */
export class AIModel extends AggregateRoot<AIModelId> {
  private readonly _tenantId: TenantId;
  private readonly _reference: ModelReference;
  private readonly _kind: AIModelKind;
  private readonly _completionProfile?: CompletionModel;
  private readonly _embeddingProfile?: EmbeddingModel;
  private _enabled: boolean;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: AIModelSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._reference = snapshot.reference;
    this._kind = snapshot.kind;
    this._completionProfile = snapshot.completionProfile;
    this._embeddingProfile = snapshot.embeddingProfile;
    this._enabled = snapshot.enabled;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Register a model (disabled until explicitly enabled). */
  static register(props: RegisterAIModelProps, clock: Clock): AIModel {
    if (props.kind === 'completion' && props.completionProfile === undefined) {
      throw new InvariantViolationError('Completion models require a completion profile', {
        model: props.reference.toString(),
      });
    }
    if (props.kind === 'embedding' && props.embeddingProfile === undefined) {
      throw new InvariantViolationError('Embedding models require an embedding profile', {
        model: props.reference.toString(),
      });
    }
    const now = clock.now();
    const model = new AIModel({
      id: props.id,
      tenantId: props.tenantId,
      reference: props.reference,
      kind: props.kind,
      completionProfile: props.completionProfile,
      embeddingProfile: props.embeddingProfile,
      enabled: false,
      createdAt: now,
      updatedAt: now,
    });
    model.raise({
      ...model.eventEnvelope(now),
      eventType: AI_MODEL_REGISTERED,
      payload: {
        modelId: props.id.value(),
        provider: props.reference.provider.value,
        modelName: props.reference.modelName,
        kind: props.kind,
      },
    });
    return model;
  }

  /** Rehydrate an existing model from persisted state. Raises no events. */
  static reconstitute(snapshot: AIModelSnapshot): AIModel {
    return new AIModel(snapshot);
  }

  enable(clock: Clock): void {
    if (this._enabled) return;
    const now = clock.now();
    this._enabled = true;
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: AI_MODEL_ENABLED,
      payload: { modelId: this.id.value() },
    });
  }

  disable(clock: Clock): void {
    if (!this._enabled) return;
    const now = clock.now();
    this._enabled = false;
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: AI_MODEL_DISABLED,
      payload: { modelId: this.id.value() },
    });
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get reference(): ModelReference {
    return this._reference;
  }

  get kind(): AIModelKind {
    return this._kind;
  }

  get completionProfile(): CompletionModel | undefined {
    return this._completionProfile;
  }

  get embeddingProfile(): EmbeddingModel | undefined {
    return this._embeddingProfile;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  private raise(event: AnyAIEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: AIModelId;
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
