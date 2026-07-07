import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import type { Identifier } from './identifier.js';

/**
 * A fact about something that happened in the domain, raised by an aggregate
 * and committed to the event stream. Domain events are immutable and their
 * version reflects changes to the schema over time.
 *
 * No transport concerns here — just the contract.
 */
export interface DomainEvent<TPayload = unknown> {
  readonly eventId: UUID;
  readonly aggregateId: Identifier<string>;
  readonly tenantId: TenantId;
  readonly occurredAt: IsoTimestamp;
  readonly version: number;
  readonly payload: TPayload;
}

/**
 * Minimal factory for creating domain events. Callers provide timestamp and
 * payload; infrastructure fills in eventId if needed.
 */
export function createDomainEvent<T>(
  aggregateId: Identifier<string>,
  tenantId: TenantId,
  occurredAt: IsoTimestamp,
  payload: T,
): Omit<DomainEvent<T>, 'eventId'> {
  return {
    aggregateId,
    tenantId,
    occurredAt,
    payload,
    version: 1,
  };
}
