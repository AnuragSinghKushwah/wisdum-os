import { randomUUID } from 'node:crypto';
import type { DomainEventPublisher } from '@wisdum/application';
import type { PendingDomainEvent } from '@wisdum/domain';
import type { EventBus } from '@wisdum/events';
import type { UUID } from '@wisdum/types';

/**
 * Publishes pending domain events onto an `EventBus`, assigning each its
 * identity at the point of publication (the domain never generates
 * identifiers). The bus implementation itself — in-memory, brokered — is
 * supplied by the caller; this adapter only bridges the two shapes.
 */
export class EventBusDomainEventPublisher implements DomainEventPublisher {
  constructor(private readonly bus: EventBus) {}

  async publishAll(events: readonly PendingDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.bus.publish({
        id: randomUUID() as UUID,
        name: event.eventType as `${string}.${string}.${string}`,
        version: event.version,
        tenantId: event.tenantId,
        occurredAt: event.occurredAt,
        payload: event.payload,
      });
    }
  }
}
