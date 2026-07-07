import type { Event } from '@wisdum/events';

/**
 * Transactional outbox port: events are appended in the same database
 * transaction as the state change that raised them, then a separate relay
 * drains pending rows onto the `EventBus`. This is what makes publication
 * atomic with persistence — interface only, the transactional guarantee
 * comes from whatever repository implementation shares the transaction.
 */
export interface Outbox {
  enqueue(event: Event): Promise<void>;
  /** Pending events in enqueue order, oldest first. */
  pending(limit: number): Promise<readonly Event[]>;
  markPublished(eventId: Event['id']): Promise<void>;
}

/** In-memory outbox for development and tests. No transactional guarantee. */
export class InMemoryOutbox implements Outbox {
  private readonly queue: Event[] = [];

  enqueue(event: Event): Promise<void> {
    this.queue.push(event);
    return Promise.resolve();
  }

  pending(limit: number): Promise<readonly Event[]> {
    return Promise.resolve(this.queue.slice(0, limit));
  }

  markPublished(eventId: Event['id']): Promise<void> {
    const index = this.queue.findIndex((event) => event.id === eventId);
    if (index !== -1) this.queue.splice(index, 1);
    return Promise.resolve();
  }
}
