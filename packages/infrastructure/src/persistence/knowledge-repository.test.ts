import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import {
  Knowledge,
  KnowledgeId,
  KnowledgeSlug,
  KnowledgeSource,
  KnowledgeTitle,
  KnowledgeType,
  KnowledgeVisibility,
} from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import { assertRepositoryContract } from './repository-contract.test-helper.js';
import { InMemoryKnowledgeRepository } from './knowledge-repository.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createKnowledge(id: string, slug: string) {
  return Knowledge.create(
    {
      id: KnowledgeId.create(id),
      tenantId: TENANT_ID,
      title: KnowledgeTitle.create('Asset'),
      slug: KnowledgeSlug.create(slug),
      type: KnowledgeType.create('document'),
      visibility: KnowledgeVisibility.create('private'),
      source: KnowledgeSource.create({ kind: 'manual' }),
    },
    clock,
  );
}

describe('InMemoryKnowledgeRepository', () => {
  it('satisfies the generic Repository contract', async () => {
    const repository = new InMemoryKnowledgeRepository();
    const id = KnowledgeId.create('11111111-1111-1111-1111-111111111111');
    await assertRepositoryContract(repository, createKnowledge(id.value(), 'asset-one'), id);
  });

  it('findBySlug() is tenant-scoped', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.save(createKnowledge('11111111-1111-1111-1111-111111111111', 'asset-two'));

    const found = await repository.findBySlug(TENANT_ID, KnowledgeSlug.create('asset-two'));
    expect(found.some).toBe(true);

    const otherTenant = await repository.findBySlug(
      'tenant-2' as TenantId,
      KnowledgeSlug.create('asset-two'),
    );
    expect(otherTenant.some).toBe(false);
  });
});
