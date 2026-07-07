import type { PendingDomainEvent } from './domain-event.js';
import type { Identifier } from './identifier.js';
import { Entity } from './entity.js';

/**
 * An aggregate root is an entity that acts as a consistency boundary. It
 * records the domain events its behavior produces; infrastructure pulls and
 * publishes them after the aggregate is persisted, assigning event identity
 * at that point (the domain generates no identifiers).
 *
 * No EventBus dependency by design.
 */
export abstract class AggregateRoot<TId extends Identifier<string>> extends Entity<TId> {
  private readonly domainEvents: PendingDomainEvent[] = [];

  protected addDomainEvent(event: PendingDomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Retrieve all domain events that have not yet been published.
   * The returned array is a copy; the internal collection is not exposed.
   */
  pullDomainEvents(): readonly PendingDomainEvent[] {
    return Object.freeze([...this.domainEvents]);
  }

  /** Clear the domain event collection after publishing. */
  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }
}
