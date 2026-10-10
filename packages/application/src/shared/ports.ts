import type { TenantId, UUID } from '@wisdum/types';
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
 * Answers whether something exists *within a tenant*. Handlers use it to
 * validate an id a command refers to (an organization, a workspace, a user)
 * without depending on that context's repositories. A resource in another
 * tenant answers `false`, exactly like one that does not exist.
 */
export interface TenantResourceLookup {
  existsInTenant(tenantId: TenantId, id: string): Promise<boolean>;
}

/**
 * Publishes domain events pulled from aggregates after persistence.
 * Implementations assign event identity and map to the transport envelope.
 */
export interface DomainEventPublisher {
  publishAll(events: readonly PendingDomainEvent[]): Promise<void>;
}

/** Per-call limits for a completion. Reasoning prompts want short answers; drafts want room. */
export interface LlmCompletionOptions {
  readonly maxOutputTokens?: number;
  /**
   * When the model stops because it hit the output limit, end the returned text with a
   * visible notice instead of handing back a silently cut-off answer. For prose a person
   * will read; never for machine-read output such as JSON.
   */
  readonly markTruncation?: boolean;
}

/**
 * A single-shot text completion, vendor-neutral. The reasoning pipeline and
 * content generation use this instead of depending on `@wisdum/platform-ai`
 * directly — the application layer never depends on a platform package;
 * the composition root wires a real `LlmProvider` behind this port.
 */
export interface LlmCompletionPort {
  complete(prompt: string, options?: LlmCompletionOptions): Promise<string>;
  /**
   * True for the offline stand-in that returns canned text when no AI
   * provider is configured. Use cases that must be grounded in the user's
   * material refuse to run against it instead of fabricating output.
   */
  readonly isMock?: boolean;
}

/**
 * Enumerates every tenant that exists in the platform. Read-only and
 * deliberately minimal — there is no domain `Tenant` aggregate yet (rows
 * in the `tenants` table are created out-of-band today, not through any
 * application command); this port exists only to unblock "run this job
 * for every tenant" scheduling. A full Tenant bounded context
 * (creation/provisioning) is separate, later work.
 */
export interface TenantDirectory {
  listAllTenantIds(): Promise<readonly TenantId[]>;
}
