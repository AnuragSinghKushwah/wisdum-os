import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrateUp, resolveTestDatabaseUrl } from '@wisdum/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresVectorStore } from './vector-store.postgres.js';

const { Pool } = pg;
const databaseUrl = resolveTestDatabaseUrl();

/** Requires TEST_DATABASE_URL (see packages/database/README.md). Skipped automatically otherwise. */
describe.skipIf(databaseUrl === undefined)('PostgresVectorStore (integration)', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const store = new PostgresVectorStore(pool);
  const indexName = `test-index-${randomUUID()}`;

  beforeAll(async () => {
    await migrateUp(pool);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM vector_records WHERE index_name = $1', [indexName]);
    await pool.end();
  });

  it('upserts records and returns nearest neighbors by cosine similarity, highest score first', async () => {
    await store.upsert(indexName, [
      { id: 'a', vector: [1, 0, 0], metadata: { label: 'a' } },
      { id: 'b', vector: [0, 1, 0], metadata: { label: 'b' } },
      { id: 'c', vector: [0.9, 0.1, 0], metadata: { label: 'c' } },
    ]);

    const hits = await store.query(indexName, [1, 0, 0], 2);

    expect(hits).toHaveLength(2);
    expect(hits[0]?.id).toBe('a');
    expect(hits[0]?.metadata).toEqual({ label: 'a' });
    expect(hits[1]?.id).toBe('c');
  });

  it('updates an existing record on re-upsert instead of duplicating it', async () => {
    await store.upsert(indexName, [{ id: 'dup', vector: [1, 1, 0], metadata: { v: 1 } }]);
    await store.upsert(indexName, [{ id: 'dup', vector: [1, 1, 0], metadata: { v: 2 } }]);

    const hits = await store.query(indexName, [1, 1, 0], 10);
    const dup = hits.filter((hit) => hit.id === 'dup');

    expect(dup).toHaveLength(1);
    expect(dup[0]?.metadata).toEqual({ v: 2 });
  });

  it('deletes records by id', async () => {
    await store.upsert(indexName, [{ id: 'to-delete', vector: [0, 0, 1] }]);
    await store.delete(indexName, ['to-delete']);

    const hits = await store.query(indexName, [0, 0, 1], 10);
    expect(hits.some((hit) => hit.id === 'to-delete')).toBe(false);
  });
});
