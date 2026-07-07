import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '@wisdum/domain';

/**
 * Outbound ports every context's handlers may need. Implementations live
 * in `@wisdum/infrastructure`; the application layer only declares what it
 * requires.
 */

/** Generates identifiers — the domain never generates its own (ADR 0007). */
export interface IdGenerator {
  nextId(): UUID;
}

/** Generates URL-safe slugs from human-readable names. */
export interface SlugGenerator {
  slugify(input: string): string;
}

/**
 * Publishes domain events pulled from aggregates after persistence.
 * Implementations assign event identity and map to the transport envelope.
 */
export interface DomainEventPublisher {
  publishAll(events: readonly PendingDomainEvent[]): Promise<void>;
}
