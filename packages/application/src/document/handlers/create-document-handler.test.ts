import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import type { Clock, Document, DocumentRepository, ContentHash } from '@wisdum/domain';
import type { EmbeddingPipeline, EmbeddingPipelineRequest } from '@wisdum/platform-search';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { ContentHasher } from '../ports/content-hasher.js';
import { createDocumentCommand } from '../commands/create-document-command.js';
import { CreateDocumentHandler } from './create-document-handler.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };
const events: DomainEventPublisher = { publishAll: () => Promise.resolve() };

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

class FakeDocumentRepository implements DocumentRepository {
  private readonly byHash = new Map<string, Document>();
  findById(): Promise<Option<Document>> {
    throw new Error('not used in this test');
  }
  findByContentHash(_tenantId: TenantId, hash: ContentHash): Promise<Option<Document>> {
    const found = this.byHash.get(hash.digest);
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  exists(): Promise<boolean> {
    throw new Error('not used in this test');
  }
  save(document: Document): Promise<void> {
    this.byHash.set(document.contentHash.digest, document);
    return Promise.resolve();
  }
  delete(): Promise<void> {
    throw new Error('not used in this test');
  }
}

describe('CreateDocumentHandler', () => {
  it('runs the embedding pipeline for text content, scoped to a tenant index', async () => {
    const seen: EmbeddingPipelineRequest[] = [];
    const pipeline: EmbeddingPipeline = {
      run: (request) => {
        seen.push(request);
        return Promise.resolve({ chunkCount: 1 });
      },
      remove: () => Promise.resolve(),
    };
    const handler = new CreateDocumentHandler(
      new FakeDocumentRepository(),
      ids,
      hasher,
      events,
      clock,
      pipeline,
      'test-model',
    );

    const result = await handler.execute(
      createDocumentCommand({
        tenantId: TENANT_ID,
        content: 'hello world',
        mimeType: 'text/plain',
        encoding: 'utf-8',
      }),
    );

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      indexName: `knowledge:${TENANT_ID}`,
      sourceId: result.documentId,
      text: 'hello world',
      model: 'test-model',
    });
  });

  it('skips embedding for non-text mime types', async () => {
    const seen: EmbeddingPipelineRequest[] = [];
    const pipeline: EmbeddingPipeline = {
      run: (request) => {
        seen.push(request);
        return Promise.resolve({ chunkCount: 1 });
      },
      remove: () => Promise.resolve(),
    };
    const handler = new CreateDocumentHandler(
      new FakeDocumentRepository(),
      ids,
      hasher,
      events,
      clock,
      pipeline,
      'test-model',
    );

    await handler.execute(
      createDocumentCommand({
        tenantId: TENANT_ID,
        content: 'binary-ish',
        mimeType: 'application/octet-stream',
        encoding: 'utf-8',
      }),
    );

    expect(seen).toHaveLength(0);
  });

  it('does not fail document creation when the embedding pipeline throws', async () => {
    const pipeline: EmbeddingPipeline = {
      run: () => Promise.reject(new Error('provider unavailable')),
      remove: () => Promise.resolve(),
    };
    const handler = new CreateDocumentHandler(
      new FakeDocumentRepository(),
      ids,
      hasher,
      events,
      clock,
      pipeline,
      'test-model',
    );

    const result = await handler.execute(
      createDocumentCommand({
        tenantId: TENANT_ID,
        content: 'still saved',
        mimeType: 'text/plain',
        encoding: 'utf-8',
      }),
    );

    expect(result.documentId).toBeDefined();
  });

  it('does not embed when no pipeline is configured', async () => {
    const handler = new CreateDocumentHandler(new FakeDocumentRepository(), ids, hasher, events, clock);

    const result = await handler.execute(
      createDocumentCommand({
        tenantId: TENANT_ID,
        content: 'no pipeline',
        mimeType: 'text/plain',
        encoding: 'utf-8',
      }),
    );

    expect(result.documentId).toBeDefined();
  });
});
