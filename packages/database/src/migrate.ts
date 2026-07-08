#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createLogger } from '@wisdum/logger';

const { Pool } = pg;
const logger = createLogger('database-migrate');

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

interface Migration {
  readonly id: string;
  readonly direction: 'up' | 'down';
  readonly path: string;
}

function loadMigrations(direction: 'up' | 'down'): Migration[] {
  const suffix = `.${direction}.sql`;
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(suffix))
    .map((file) => ({
      id: file.slice(0, file.indexOf('_')),
      direction,
      path: join(migrationsDir, file),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function ensureMigrationsTable(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrationIds(pool: pg.Pool): Promise<Set<string>> {
  const result = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
  return new Set(result.rows.map((row) => row.id));
}

/**
 * Arbitrary fixed key for the session-level advisory lock guarding migrations.
 * Prevents concurrent callers (e.g. multiple API replicas booting together,
 * or parallel test suites) from racing to apply the same migration twice.
 */
const MIGRATION_LOCK_KEY = 72_845_190;

/** Applies every pending `*.up.sql` migration, in filename order, tracked in `schema_migrations`. */
export async function migrateUp(pool: pg.Pool): Promise<readonly string[]> {
  const lockClient = await pool.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);

    await ensureMigrationsTable(pool);
    const applied = await appliedMigrationIds(pool);
    const pending = loadMigrations('up').filter((migration) => !applied.has(migration.id));

    const appliedNow: string[] = [];
    for (const migration of pending) {
      const sql = readFileSync(migration.path, 'utf-8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        await client.query('COMMIT');
        appliedNow.push(migration.id);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.id} failed: ${(error as Error).message}`, {
          cause: error,
        });
      } finally {
        client.release();
      }
    }
    return appliedNow;
  } finally {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    lockClient.release();
  }
}

/** Reverts the most recently applied migration using its `*.down.sql` counterpart. */
export async function migrateDown(pool: pg.Pool): Promise<string | undefined> {
  await ensureMigrationsTable(pool);
  const applied = await appliedMigrationIds(pool);
  const downMigrations = loadMigrations('down');
  const lastApplied = [...applied].sort().at(-1);
  if (lastApplied === undefined) return undefined;

  const migration = downMigrations.find((candidate) => candidate.id === lastApplied);
  if (migration === undefined) {
    throw new Error(`No down migration found for ${lastApplied}`);
  }

  const sql = readFileSync(migration.path, 'utf-8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE id = $1', [lastApplied]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Rollback of ${lastApplied} failed: ${(error as Error).message}`, {
      cause: error,
    });
  } finally {
    client.release();
  }
  return lastApplied;
}

async function main(): Promise<void> {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const url = process.env['DATABASE_URL'];
  if (url === undefined) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({ connectionString: url });
  try {
    if (direction === 'up') {
      const applied = await migrateUp(pool);
      logger.info(
        applied.length > 0 ? `Applied migrations: ${applied.join(', ')}` : 'No pending migrations.',
      );
    } else {
      const reverted = await migrateDown(pool);
      logger.info(reverted !== undefined ? `Reverted migration: ${reverted}` : 'Nothing to revert.');
    }
  } finally {
    await pool.end();
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error: unknown) => {
    logger.error('Migration failed', { error: error instanceof Error ? error.message : error });
    process.exitCode = 1;
  });
}
