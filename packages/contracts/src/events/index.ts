/**
 * Event naming and versioning contracts.
 * Runtime interfaces (Event, EventHandler, EventBus) live in `@wisdum/events`.
 */

/** Event names follow `[domain].[entity].[action]`, e.g. `knowledge.document.created`. */
export type EventName = `${string}.${string}.${string}`;

/** Identity of a versioned event contract; payload schemas evolve behind the version. */
export interface EventContract {
  readonly name: EventName;
  readonly version: number;
}
