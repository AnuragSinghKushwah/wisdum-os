import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import type { Identifier } from './identifier.js';

/**
 * A fact about something that happened in the domain, raised by an aggregate.
 * Domain events are immutable; `version` is the schema version of the concrete
 * event type, and `eventType` follows the platform naming convention
 * `[domain].[entity].[action]` (e.g. `knowledge.asset.created`).
 *
 * No transport concerns here — mapping to the `@wisdum/events` envelope is
 * infrastructure's job.
 */
export interface DomainEvent<TPayload = unknown> {
  readonly eventId: UUID;
  readonly eventType: string;
  readonly aggregateId: Identifier<string>;
  readonly tenantId: TenantId;
  readonly occurredAt: IsoTimestamp;
  readonly version: number;
  readonly payload: TPayload;
}

/**
 * A domain event as recorded inside an aggregate. The domain never generates
 * identifiers, so `eventId` is absent until infrastructure assigns it at
 * publication time.
 */
export type PendingDomainEvent<TPayload = unknown> = Omit<DomainEvent<TPayload>, 'eventId'>;

/** Build a pending domain event with schema version 1. */
export function createDomainEvent<T>(
  eventType: string,
  aggregateId: Identifier<string>,
  tenantId: TenantId,
  occurredAt: IsoTimestamp,
  payload: T,
): PendingDomainEvent<T> {
  return {
    eventType,
    aggregateId,
    tenantId,
    occurredAt,
    payload,
    version: 1,
  };
}
