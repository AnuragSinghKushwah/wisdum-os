import type { DomainEvent } from './domain-event.js';
import type { Identifier } from './identifier.js';
import { Entity } from './entity.js';

/**
 * An aggregate root is an entity that acts as a consistency boundary. It
 * maintains a collection of domain events that represent everything that
 * happened to the aggregate. The aggregate is responsible for ensuring its
 * invariants remain satisfied.
 *
 * Domain events are published when the aggregate is saved (in the
 * application service layer), never directly by the aggregate.
 */
export abstract class AggregateRoot<TId extends Identifier<string>> extends Entity<TId> {
  private readonly domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Retrieve all domain events that have not yet been published.
   * The returned array is a copy; the internal collection is not exposed.
   */
  pullDomainEvents(): readonly DomainEvent[] {
    return Object.freeze([...this.domainEvents]);
  }

  /** Clear the domain event collection after publishing. */
  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }
}
