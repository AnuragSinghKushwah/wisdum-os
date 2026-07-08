import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrateUp, resolveTestDatabaseUrl } from '@wisdum/database';
import {
  Knowledge,
  KnowledgeId,
  KnowledgeSlug,
  KnowledgeSource,
  KnowledgeTitle,
  KnowledgeType,
  KnowledgeVisibility,
  SystemClock,
} from '@wisdum/domain';
import type { TenantId, UUID } from '@wisdum/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresKnowledgeRepository } from './knowledge-repository.postgres.js';

const { Pool } = pg;
const databaseUrl = resolveTestDatabaseUrl();

/**
 * Requires TEST_DATABASE_URL (see packages/database/README.md). Skipped
 * automatically otherwise. Representative of the 15 Postgres repositories
 * built in Sprint 005 — none of them had ever run against a real
 * database until this test.
 */
describe.skipIf(databaseUrl === undefined)('PostgresKnowledgeRepository (integration)', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PostgresKnowledgeRepository(pool);
  const clock = SystemClock.instance();
  const tenantId = randomUUID() as unknown as TenantId;

  beforeAll(async () => {
    await migrateUp(pool);
    await pool.query(
      'INSERT INTO tenants (id, slug, name, created_at, updated_at) VALUES ($1, $2, $3, now(), now())',
      [tenantId, `test-tenant-${Date.now()}`, 'Integration Test Tenant'],
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM knowledge WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
  });

  it('round-trips a knowledge asset through save() and findById()', async () => {
    const id = KnowledgeId.create(randomUUID() as UUID);
    const knowledge = Knowledge.create(
      {
        id,
        tenantId,
        title: KnowledgeTitle.create('Integration Test Asset'),
        slug: KnowledgeSlug.create('integration-test-asset'),
        type: KnowledgeType.create('note'),
        visibility: KnowledgeVisibility.create('private'),
        source: KnowledgeSource.manual(),
      },
      clock,
    );

    await repository.save(knowledge);

    const found = await repository.findById(id);
    expect(found.some).toBe(true);
    expect(found.some && found.value.title.value).toBe('Integration Test Asset');
    expect(found.some && found.value.slug.value).toBe('integration-test-asset');
    expect(found.some && found.value.status.value).toBe('draft');
  });

  it('findBySlug() is tenant-scoped', async () => {
    const id = KnowledgeId.create(randomUUID() as UUID);
    const slug = KnowledgeSlug.create(`slug-lookup-${Date.now()}`);
    const knowledge = Knowledge.create(
      {
        id,
        tenantId,
        title: KnowledgeTitle.create('Slug Lookup Asset'),
        slug,
        type: KnowledgeType.create('note'),
        visibility: KnowledgeVisibility.create('private'),
        source: KnowledgeSource.manual(),
      },
      clock,
    );
    await repository.save(knowledge);

    const found = await repository.findBySlug(tenantId, slug);
    expect(found.some).toBe(true);
    expect(found.some && found.value.getId().value()).toBe(id.value());

    const otherTenant = randomUUID() as unknown as TenantId;
    const notFound = await repository.findBySlug(otherTenant, slug);
    expect(notFound.some).toBe(false);
  });

  it('save() persists a status transition raised after reconstitution', async () => {
    const id = KnowledgeId.create(randomUUID() as UUID);
    const knowledge = Knowledge.create(
      {
        id,
        tenantId,
        title: KnowledgeTitle.create('Publish Me'),
        slug: KnowledgeSlug.create(`publish-me-${Date.now()}`),
        type: KnowledgeType.create('note'),
        visibility: KnowledgeVisibility.create('private'),
        source: KnowledgeSource.manual(),
      },
      clock,
    );
    await repository.save(knowledge);

    const found = await repository.findById(id);
    expect(found.some).toBe(true);
    if (!found.some) return;
    found.value.startProcessing(clock);
    found.value.completeProcessing(clock);
    await repository.save(found.value);

    const reloaded = await repository.findById(id);
    expect(reloaded.some && reloaded.value.status.value).toBe('active');
  });

  it('delete() removes the asset', async () => {
    const id = KnowledgeId.create(randomUUID() as UUID);
    const knowledge = Knowledge.create(
      {
        id,
        tenantId,
        title: KnowledgeTitle.create('Delete Me'),
        slug: KnowledgeSlug.create(`delete-me-${Date.now()}`),
        type: KnowledgeType.create('note'),
        visibility: KnowledgeVisibility.create('private'),
        source: KnowledgeSource.manual(),
      },
      clock,
    );
    await repository.save(knowledge);
    await repository.delete(knowledge);

    const found = await repository.findById(id);
    expect(found.some).toBe(false);
  });
});
