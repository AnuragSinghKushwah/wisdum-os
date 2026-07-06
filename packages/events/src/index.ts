/**
 * Runtime eventing interfaces — the only sanctioned channel for
 * cross-package communication. This package intentionally contains no
 * implementation; transports are provided by the platform layer or a
 * broker plugin under a future ADR.
 */
import type { EventName } from '@wisdum/contracts';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';

/** Immutable envelope for a domain event. */
export interface Event<TPayload = unknown> {
  readonly id: UUID;
  readonly name: EventName;
  readonly version: number;
  readonly tenantId: TenantId;
  readonly occurredAt: IsoTimestamp;
  readonly payload: TPayload;
}

/** Reacts to a single event. Handlers must be idempotent — delivery is at-least-once. */
export type EventHandler<TPayload = unknown> = (event: Event<TPayload>) => Promise<void>;

/** Publishes and subscribes to domain events across package boundaries. */
export interface EventBus {
  publish(event: Event): Promise<void>;
  /** Returns an unsubscribe function. */
  subscribe<TPayload>(name: EventName, handler: EventHandler<TPayload>): () => void;
}
