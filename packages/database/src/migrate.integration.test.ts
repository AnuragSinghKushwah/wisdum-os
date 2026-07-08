import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { migrateUp } from './migrate.js';
import { resolveTestDatabaseUrl } from './test-support.js';

const { Pool } = pg;
const databaseUrl = resolveTestDatabaseUrl();

/**
 * Requires TEST_DATABASE_URL (see packages/database/README.md). Skipped
 * automatically otherwise. Only exercises migrateUp: a shared test
 * database may have other integration tests relying on its schema
 * concurrently, so tearing everything down here isn't safe.
 */
describe.skipIf(databaseUrl === undefined)('migrateUp against a real database', () => {
  const pool = new Pool({ connectionString: databaseUrl });

  afterAll(async () => {
    await pool.end();
  });

  it('applies every migration and is idempotent on a second run', async () => {
    const firstRun = await migrateUp(pool);
    expect(firstRun.length).toBeGreaterThan(0);

    const secondRun = await migrateUp(pool);
    expect(secondRun).toEqual([]);
  });

  it('creates the tables every bounded context depends on', async () => {
    const result = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const tableNames = result.rows.map((row) => row.table_name);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'tenants',
        'organizations',
        'workspaces',
        'users',
        'knowledge',
        'documents',
        'ai_models',
        'search_provider_documents',
      ]),
    );
  });
});
