import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import {
  ContentHash,
  Document,
  DocumentId,
  Knowledge,
  KnowledgeId,
  KnowledgeSlug,
} from '@wisdum/domain';
import type { Clock, DocumentRepository, KnowledgeRepository } from '@wisdum/domain';
import type { DomainEventPublisher, IdGenerator, SlugGenerator } from '../../../shared/ports.js';
import type { ContentHasher } from '../../../document/ports/content-hasher.js';
import { CreateDocumentHandler } from '../../../document/handlers/create-document-handler.js';
import { CreateKnowledgeHandler } from '../../../knowledge/handlers/create-knowledge-handler.js';
import { AttachKnowledgeContentHandler } from '../../../knowledge/handlers/attach-knowledge-content-handler.js';
import { toKnowledgeDto } from '../../../knowledge/index.js';
import type { KnowledgeDto, KnowledgeReadModel } from '../../../knowledge/index.js';
import { IngestWebhookHandler } from '../ingest-webhook-handler.js';
import { ingestWebhookCommand } from '../../commands/ingest-webhook-command.js';

const TENANT_ID = 'tenant-test-ingest' as TenantId;
const clock: Clock = { now: () => '2026-07-24T12:00:00.000Z' as IsoTimestamp };

let idCounter = 0;
const ids: IdGenerator = {
  nextId: () => {
    idCounter += 1;
    return `00000000-0000-0000-0000-${idCounter.toString().padStart(12, '0')}` as UUID;
  },
};

const hasher: ContentHasher = {
  hash: (content) => ({
    algorithm: 'sha-256',
    digest: createHash('sha256').update(content).digest('hex'),
  }),
};

const slugs: SlugGenerator = {
  slugify: (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
};

const events: DomainEventPublisher = {
  publishAll: () => Promise.resolve(),
};

class FakeDocumentRepository implements DocumentRepository {
  private readonly items = new Map<string, Document>();

  findById(id: DocumentId): Promise<Option<Document>> {
    const item = this.items.get(id.value());
    return Promise.resolve(item ? { some: true, value: item } : { some: false });
  }

  findByContentHash(tenantId: TenantId, contentHash: ContentHash): Promise<Option<Document>> {
    for (const item of this.items.values()) {
      if (item.tenantId === tenantId && item.contentHash.equals(contentHash)) {
        return Promise.resolve({ some: true, value: item });
      }
    }
    return Promise.resolve({ some: false });
  }

  exists(id: DocumentId): Promise<boolean> {
    return Promise.resolve(this.items.has(id.value()));
  }

  save(document: Document): Promise<void> {
    this.items.set(document.getId().value(), document);
    return Promise.resolve();
  }

  delete(document: Document): Promise<void> {
    this.items.delete(document.getId().value());
    return Promise.resolve();
  }
}

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

class FakeKnowledgeReadModel implements KnowledgeReadModel {
  constructor(private readonly repo: FakeKnowledgeRepository) {}

  async listByTenant(tenantId: TenantId): Promise<readonly KnowledgeDto[]> {
    const items = await this.repo.list(tenantId);
    return items.map((k) => toKnowledgeDto(k));
  }

  async findById(): Promise<KnowledgeDto | undefined> {
    return undefined;
  }
}

describe('IngestWebhookHandler', () => {
  it('ingests external webhook content into Document and Knowledge', async () => {
    const docRepo = new FakeDocumentRepository();
    const knowRepo = new FakeKnowledgeRepository();
    const readModel = new FakeKnowledgeReadModel(knowRepo);

    const createDoc = new CreateDocumentHandler(docRepo, ids, hasher, events, clock);
    const createKnow = new CreateKnowledgeHandler(knowRepo, ids, slugs, events, clock);
    const attachContent = new AttachKnowledgeContentHandler(knowRepo, docRepo, events, clock);

    const handler = new IngestWebhookHandler(createDoc, createKnow, attachContent, readModel);

    const result = await handler.execute(
      ingestWebhookCommand({
        tenantId: TENANT_ID,
        source: 'github',
        title: 'Release Notes v2.7',
        content: '# Release Notes\n\nAdded Ingestion Engine and Webhook routes.',
        sourceUri: 'https://github.com/org/repo/releases/v2.7',
        labels: ['github', 'release'],
      }),
    );

    expect(result.status).toBe('created');
    expect(result.isDuplicate).toBe(false);
    expect(result.knowledgeId).toBeDefined();
    expect(result.documentId).toBeDefined();

    const createdKnowledge = await knowRepo.findById(KnowledgeId.create(result.knowledgeId as UUID));
    expect(createdKnowledge.some).toBe(true);
    if (createdKnowledge.some) {
      expect(createdKnowledge.value.title.value).toBe('Release Notes v2.7');
      expect(createdKnowledge.value.source.kind).toBe('integration');
      expect(createdKnowledge.value.source.uri).toBe('https://github.com/org/repo/releases/v2.7');
      expect(createdKnowledge.value.contentReferences.length).toBe(1);
    }
  });

  it('deduplicates duplicate content ingested for the same tenant', async () => {
    const docRepo = new FakeDocumentRepository();
    const knowRepo = new FakeKnowledgeRepository();
    const readModel = new FakeKnowledgeReadModel(knowRepo);

    const createDoc = new CreateDocumentHandler(docRepo, ids, hasher, events, clock);
    const createKnow = new CreateKnowledgeHandler(knowRepo, ids, slugs, events, clock);
    const attachContent = new AttachKnowledgeContentHandler(knowRepo, docRepo, events, clock);

    const handler = new IngestWebhookHandler(createDoc, createKnow, attachContent, readModel);

    const cmd = ingestWebhookCommand({
      tenantId: TENANT_ID,
      source: 'notion',
      title: 'Meeting Notes',
      content: 'Identical content for testing deduplication.',
    });

    const firstResult = await handler.execute(cmd);
    expect(firstResult.status).toBe('created');

    const secondResult = await handler.execute(cmd);
    expect(secondResult.status).toBe('deduplicated');
    expect(secondResult.isDuplicate).toBe(true);
    expect(secondResult.knowledgeId).toBe(firstResult.knowledgeId);
    expect(secondResult.documentId).toBe(firstResult.documentId);
  });
});
