import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { AIProviderId } from '../value-objects/ai-ids.js';
import type { ProviderName } from '../value-objects/provider-name.js';
import {
  AI_EVENT_SCHEMA_VERSION,
  AI_PROVIDER_DISABLED,
  AI_PROVIDER_ENABLED,
  AI_PROVIDER_REGISTERED,
} from '../events/ai-events.js';
import type { AnyAIEvent } from '../events/ai-events.js';

/** What callers provide to register an AI provider. */
export interface RegisterAIProviderProps {
  readonly id: AIProviderId;
  readonly tenantId: TenantId;
  readonly name: ProviderName;
  readonly displayName: string;
}

/** Full state needed to rehydrate an existing provider (no events are raised). */
export interface AIProviderSnapshot {
  readonly id: AIProviderId;
  readonly tenantId: TenantId;
  readonly name: ProviderName;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * A registered AI provider for a tenant (e.g. Anthropic, a local runtime).
 * Providers arrive as plugins; this aggregate records their registration
 * and availability. Credentials are configuration, never domain state.
 */
export class AIProvider extends AggregateRoot<AIProviderId> {
  private readonly _tenantId: TenantId;
  private readonly _name: ProviderName;
  private _displayName: string;
  private _enabled: boolean;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: AIProviderSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._name = snapshot.name;
    this._displayName = snapshot.displayName;
    this._enabled = snapshot.enabled;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Register a provider (disabled until explicitly enabled). */
  static register(props: RegisterAIProviderProps, clock: Clock): AIProvider {
    const now = clock.now();
    const provider = new AIProvider({
      id: props.id,
      tenantId: props.tenantId,
      name: props.name,
      displayName: props.displayName,
      enabled: false,
      createdAt: now,
      updatedAt: now,
    });
    provider.raise({
      ...provider.eventEnvelope(now),
      eventType: AI_PROVIDER_REGISTERED,
      payload: { providerId: props.id.value(), name: props.name.value },
    });
    return provider;
  }

  /** Rehydrate an existing provider from persisted state. Raises no events. */
  static reconstitute(snapshot: AIProviderSnapshot): AIProvider {
    return new AIProvider(snapshot);
  }

  enable(clock: Clock): void {
    if (this._enabled) return;
    const now = clock.now();
    this._enabled = true;
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: AI_PROVIDER_ENABLED,
      payload: { providerId: this.id.value(), name: this._name.value },
    });
  }

  disable(clock: Clock): void {
    if (!this._enabled) return;
    const now = clock.now();
    this._enabled = false;
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: AI_PROVIDER_DISABLED,
      payload: { providerId: this.id.value(), name: this._name.value },
    });
  }

  rename(displayName: string, clock: Clock): void {
    if (this._displayName === displayName) return;
    this._displayName = displayName;
    this._updatedAt = clock.now();
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): ProviderName {
    return this._name;
  }

  get displayName(): string {
    return this._displayName;
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
    aggregateId: AIProviderId;
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
