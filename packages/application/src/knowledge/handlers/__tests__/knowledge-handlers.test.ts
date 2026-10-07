import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { KnowledgeId } from '@wisdum/domain';
import type { Clock, KnowledgeRepository, Knowledge, KnowledgeSlug } from '@wisdum/domain';
import type { DomainEventPublisher, IdGenerator, SlugGenerator } from '../../../shared/ports.js';
import { CreateKnowledgeHandler } from '../create-knowledge-handler.js';
import { UpdateKnowledgeHandler } from '../update-knowledge-handler.js';
import { DeleteKnowledgeHandler } from '../delete-knowledge-handler.js';
import { ChangeKnowledgeVisibilityHandler } from '../change-knowledge-visibility-handler.js';
import { ImportKnowledgeHandler } from '../import-knowledge-handler.js';
import { NotFoundError } from '../../../shared/errors.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2026-07-24T00:00:00.000Z' as IsoTimestamp };

let eventLogs: unknown[] = [];
const events: DomainEventPublisher = {
  publishAll: (domainEvents) => {
    eventLogs.push(...domainEvents);
    return Promise.resolve();
  },
};

let idCounter = 0;
const ids: IdGenerator = {
  nextId: () => {
    idCounter += 1;
    return `00000000-0000-0000-0000-${idCounter.toString().padStart(12, '0')}` as UUID;
  },
};

const slugs: SlugGenerator = {
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
};

class FakeKnowledgeRepository implements KnowledgeRepository {
  private readonly items = new Map<string, Knowledge>();

  findById(id: KnowledgeId): Promise<Option<Knowledge>> {
    const item = this.items.get(id.value());
    return Promise.resolve(item ? { some: true, value: item } : { some: false });
  }

  findBySlug(tenantId: TenantId, slug: KnowledgeSlug): Promise<Option<Knowledge>> {
    for (const item of this.items.values()) {
      if (item.tenantId === tenantId && item.slug.equals(slug)) {
        return Promise.resolve({ some: true, value: item });
      }
    }
    return Promise.resolve({ some: false });
  }

  exists(id: KnowledgeId): Promise<boolean> {
    return Promise.resolve(this.items.has(id.value()));
  }

  save(knowledge: Knowledge): Promise<void> {
    this.items.set(knowledge.getId().value(), knowledge);
    return Promise.resolve();
  }

  delete(knowledge: Knowledge): Promise<void> {
    this.items.delete(knowledge.getId().value());
    return Promise.resolve();
  }

  list(tenantId: TenantId): Promise<readonly Knowledge[]> {
    return Promise.resolve(Array.from(this.items.values()).filter((k) => k.tenantId === tenantId));
  }
}

describe('Knowledge Application Layer Handlers', () => {
  it('creates a new Knowledge asset in draft status', async () => {
    eventLogs = [];
    const repo = new FakeKnowledgeRepository();
    const handler = new CreateKnowledgeHandler(repo, ids, slugs, events, clock);

    const result = await handler.execute({
      kind: 'command',
      tenantId: TENANT_ID,
      title: 'Architecture Strategy',
      type: 'document',
      visibility: 'workspace',
      sourceKind: 'manual',
      description: 'Core platform architecture guidelines',
      labels: ['architecture', 'ddd'],
    });

    expect(result.knowledgeId).toBeDefined();
    const fetched = await repo.findById(KnowledgeId.create(result.knowledgeId as UUID));
    expect(fetched.some).toBe(true);
    if (fetched.some) {
      expect(fetched.value.title.value).toBe('Architecture Strategy');
      expect(fetched.value.status.value).toBe('draft');
      expect(fetched.value.visibility.value).toBe('workspace');
    }
  });

  it('updates title, description, and labels on existing Knowledge', async () => {
    eventLogs = [];
    const repo = new FakeKnowledgeRepository();
    const createHandler = new CreateKnowledgeHandler(repo, ids, slugs, events, clock);
    const updateHandler = new UpdateKnowledgeHandler(repo, events, clock);

    const { knowledgeId } = await createHandler.execute({
      kind: 'command',
      tenantId: TENANT_ID,
      title: 'Initial Title',
      type: 'document',
      visibility: 'private',
      sourceKind: 'manual',
    });

    await updateHandler.execute({
      kind: 'command',
      knowledgeId,
      tenantId: TENANT_ID,
      title: 'Updated Title',
      description: 'Updated Description',
      labels: ['v2'],
    });

    const fetched = await repo.findById(KnowledgeId.create(knowledgeId as UUID));
    expect(fetched.some).toBe(true);
    if (fetched.some) {
      expect(fetched.value.title.value).toBe('Updated Title');
      expect(fetched.value.description.value).toBe('Updated Description');
      expect(fetched.value.labels.map((l) => l.value)).toEqual(['v2']);
    }
  });

  it('changes visibility of a Knowledge asset', async () => {
    const repo = new FakeKnowledgeRepository();
    const createHandler = new CreateKnowledgeHandler(repo, ids, slugs, events, clock);
    const visHandler = new ChangeKnowledgeVisibilityHandler(repo, events, clock);

    const { knowledgeId } = await createHandler.execute({
      kind: 'command',
      tenantId: TENANT_ID,
      title: 'Internal Spec',
      type: 'markdown',
      visibility: 'private',
      sourceKind: 'manual',
    });

    await visHandler.execute({
      kind: 'command',
      knowledgeId,
      tenantId: TENANT_ID,
      visibility: 'public',
    });

    const fetched = await repo.findById(KnowledgeId.create(knowledgeId as UUID));
    expect(fetched.some).toBe(true);
    if (fetched.some) {
      expect(fetched.value.visibility.value).toBe('public');
    }
  });

  it('soft deletes a Knowledge asset', async () => {
    const repo = new FakeKnowledgeRepository();
    const createHandler = new CreateKnowledgeHandler(repo, ids, slugs, events, clock);
    const deleteHandler = new DeleteKnowledgeHandler(repo, events, clock);

    const { knowledgeId } = await createHandler.execute({
      kind: 'command',
      tenantId: TENANT_ID,
      title: 'Deprecated Spec',
      type: 'markdown',
      visibility: 'private',
      sourceKind: 'manual',
    });

    await deleteHandler.execute({
      kind: 'command',
      knowledgeId,
      tenantId: TENANT_ID,
    });

    const fetched = await repo.findById(KnowledgeId.create(knowledgeId as UUID));
    expect(fetched.some).toBe(true);
    if (fetched.some) {
      expect(fetched.value.status.value).toBe('deleted');
    }
  });

  it('begins and completes importing an external Knowledge asset', async () => {
    const repo = new FakeKnowledgeRepository();
    const createHandler = new CreateKnowledgeHandler(repo, ids, slugs, events, clock);
    const importHandler = new ImportKnowledgeHandler(repo, events, clock);

    const { knowledgeId } = await createHandler.execute({
      kind: 'command',
      tenantId: TENANT_ID,
      title: 'External Wiki Page',
      type: 'webpage',
      visibility: 'workspace',
      sourceKind: 'url',
      sourceUri: 'https://example.com/page-1',
    });

    await importHandler.execute({
      kind: 'command',
      knowledgeId,
      tenantId: TENANT_ID,
      sourceKind: 'url',
      sourceUri: 'https://example.com/page-1',
    });

    const fetched = await repo.findById(KnowledgeId.create(knowledgeId as UUID));
    expect(fetched.some).toBe(true);
    if (fetched.some) {
      expect(fetched.value.status.value).toBe('active');
    }
  });

  it('throws NotFoundError when executing commands on non-existent Knowledge', async () => {
    const repo = new FakeKnowledgeRepository();
    const updateHandler = new UpdateKnowledgeHandler(repo, events, clock);

    await expect(
      updateHandler.execute({
        kind: 'command',
        knowledgeId: '00000000-0000-0000-0000-000000000999',
        tenantId: TENANT_ID,
        title: 'New Title',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
