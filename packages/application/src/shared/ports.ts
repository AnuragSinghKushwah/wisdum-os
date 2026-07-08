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

/**
 * A single-shot text completion, vendor-neutral. The reasoning pipeline and
 * content generation use this instead of depending on `@wisdum/platform-ai`
 * directly — the application layer never depends on a platform package;
 * the composition root wires a real `LlmProvider` behind this port.
 */
export interface LlmCompletionPort {
  complete(prompt: string): Promise<string>;
}
