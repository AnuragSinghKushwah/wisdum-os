import pg from 'pg';
import { migrateUp, resolveTestDatabaseUrl } from '@wisdum/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresSearchProvider } from './postgres-search-provider.js';

const { Pool } = pg;
const databaseUrl = resolveTestDatabaseUrl();

/**
 * Requires TEST_DATABASE_URL (see packages/database/README.md). Skipped
 * automatically otherwise. This is the one adapter in the whole Postgres
 * persistence layer with genuinely nontrivial SQL (generated tsvector
 * column, GIN index, websearch_to_tsquery, ts_rank clamping) — only a
 * real Postgres instance can catch a syntax error or a ranking bug here.
 */
describe.skipIf(databaseUrl === undefined)('PostgresSearchProvider (integration)', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const provider = new PostgresSearchProvider(pool);
  const indexName = `test-index-${Date.now()}`;

  beforeAll(async () => {
    await migrateUp(pool);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM search_provider_documents WHERE index_name LIKE $1', [
      `${indexName}%`,
    ]);
    await pool.end();
  });

  it('indexes text and finds it via full-text search, ignoring unrelated documents', async () => {
    await provider.index(
      indexName,
      'doc-1',
      'Wisdum is an AI-native knowledge operations platform',
    );
    await provider.index(indexName, 'doc-2', 'Completely unrelated content about gardening');

    const hits = await provider.query(indexName, 'knowledge platform', 10, 0);

    expect(hits).toHaveLength(1);
    expect(hits[0]?.documentId).toBe('doc-1');
    expect(hits[0]?.score).toBeGreaterThan(0);
    expect(hits[0]?.score).toBeLessThanOrEqual(1);
  });

  it('index() upserts: re-indexing the same document replaces its content', async () => {
    await provider.index(indexName, 'doc-5', 'original wording about kittens');
    await provider.index(indexName, 'doc-5', 'replaced wording about aardvarks');

    expect(await provider.query(indexName, 'kittens', 10, 0)).toHaveLength(0);
    const hits = await provider.query(indexName, 'aardvarks', 10, 0);
    expect(hits.map((hit) => hit.documentId)).toEqual(['doc-5']);
  });

  it('remove() deletes the document from the index', async () => {
    await provider.index(indexName, 'doc-3', 'Temporary content about beekeeping');
    await provider.remove(indexName, 'doc-3');

    const hits = await provider.query(indexName, 'beekeeping', 10, 0);
    expect(hits).toHaveLength(0);
  });

  it('scopes queries to the given index name', async () => {
    const otherIndex = `${indexName}-other`;
    await provider.index(otherIndex, 'doc-4', 'Wisdum knowledge platform in another index');

    const hits = await provider.query(indexName, 'wisdum', 10, 0);

    expect(hits.some((hit) => hit.documentId === 'doc-4')).toBe(false);
    await pool.query('DELETE FROM search_provider_documents WHERE index_name = $1', [otherIndex]);
  });
});
