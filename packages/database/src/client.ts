import pg from 'pg';
import type { DatabaseConfig } from './index.js';

const { Pool } = pg;
export type PgPool = pg.Pool;
export type PgPoolClient = pg.PoolClient;

/** Creates the connection pool for the primary PostgreSQL datastore. */
export function createPgPool(config: DatabaseConfig): PgPool {
  return new Pool({
    connectionString: config.url,
    max: config.poolSize ?? 10,
  });
}

/**
 * Runs `work` inside a single transaction, committing on success and rolling
 * back on any thrown error. The client is always released back to the pool.
 */
export async function withTransaction<T>(
  pool: PgPool,
  work: (client: PgPoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
