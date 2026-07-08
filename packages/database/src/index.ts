/**
 * Persistence contracts for the primary PostgreSQL datastore (ADR 0003).
 * ORM/client selection is deferred to the first domain implementation;
 * this package holds only vendor-neutral configuration, migration, and
 * row-shape types. Schema itself lives in ../migrations; row types here
 * mirror it for typed access at the query boundary. No business logic.
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

export * from './tables/index.js';
export * from './client.js';
export { migrateUp, migrateDown } from './migrate.js';
