/**
 * Persistence contracts for the primary PostgreSQL datastore (ADR 0003).
 * ORM/client selection is deferred to the first domain implementation;
 * this package holds only vendor-neutral configuration and migration types.
 */

/** Connection settings for the primary datastore. */
export interface DatabaseConfig {
  readonly url: string;
  readonly poolSize?: number;
}

/** A versioned, reversible schema migration (see ../migrations). */
export interface MigrationDescriptor {
  readonly id: string;
  readonly description: string;
}
