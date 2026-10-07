import { describe, expect, it } from 'vitest';
import type { TenantId } from '@wisdum/types';
import { CapabilityRegistry } from '@wisdum/kernel';
import type { CapturedItem, InputConnector } from '@wisdum/platform-inputs';
import type { CreateDocumentCommand } from '../../document/commands/create-document-command.js';
import type { CreateDocumentHandler } from '../../document/handlers/create-document-handler.js';
import type { CreateKnowledgeHandler } from '../../knowledge/handlers/create-knowledge-handler.js';
import type { AttachKnowledgeContentCommand } from '../../knowledge/commands/attach-knowledge-content-command.js';
import type { AttachKnowledgeContentHandler } from '../../knowledge/handlers/attach-knowledge-content-handler.js';
import type { KnowledgeContentReferenceDto, KnowledgeDto } from '../../knowledge/dto/knowledge-dto.js';
import type { KnowledgeReadModel } from '../../knowledge/ports/knowledge-read-model.js';
import { syncInputConnectorCommand } from '../commands/sync-input-connector-command.js';
import { SyncInputConnectorHandler } from './sync-input-connector-handler.js';

const TENANT_ID = 'tenant-1' as TenantId;

class FakeConnector implements InputConnector {
  readonly capability = 'input.test-source';
  constructor(private readonly items: readonly CapturedItem[]) {}
  capture(): Promise<readonly CapturedItem[]> {
    return Promise.resolve(this.items);
  }
}

function contentRef(reference: string): KnowledgeContentReferenceDto {
  return { reference, mimeType: 'text/markdown' };
}

function knowledgeAsset(id: string, documentId: string): KnowledgeDto {
  return {
    id,
    title: `Asset ${id}`,
    slug: `asset-${id}`,
    description: '',
    type: 'document',
    status: 'active',
    visibility: 'private',
    version: 1,
    labels: [],
    contentReferences: [contentRef(documentId)],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    properties: {},
  };
}

class FakeKnowledgeReadModel implements KnowledgeReadModel {
  constructor(private assets: readonly KnowledgeDto[]) {}
  findById(): Promise<KnowledgeDto | undefined> {
    throw new Error('not used in this test');
  }
  listByTenant(): Promise<readonly KnowledgeDto[]> {
    return Promise.resolve(this.assets);
  }
  add(asset: KnowledgeDto): void {
    this.assets = [...this.assets, asset];
  }
}

/** content -> deterministic documentId, mimicking CreateDocumentHandler's content-hash dedup. */
function buildFakeHandlers(knowledgeReads: FakeKnowledgeReadModel) {
  const documentsByContent = new Map<string, string>();
  let documentCounter = 0;
  let knowledgeCounter = 0;

  const createDocument = {
    execute: (command: CreateDocumentCommand) => {
      let documentId = documentsByContent.get(command.content);
      if (documentId === undefined) {
        documentCounter += 1;
        documentId = `doc-${documentCounter}`;
        documentsByContent.set(command.content, documentId);
      }
      return Promise.resolve({ documentId });
    },
  } as unknown as CreateDocumentHandler;

  const createKnowledge = {
    execute: () => {
      knowledgeCounter += 1;
      return Promise.resolve({ knowledgeId: `knowledge-${knowledgeCounter}` });
    },
  } as unknown as CreateKnowledgeHandler;

  const attachContent = {
    execute: (command: AttachKnowledgeContentCommand) => {
      knowledgeReads.add(knowledgeAsset(command.knowledgeId, command.reference));
      return Promise.resolve();
    },
  } as unknown as AttachKnowledgeContentHandler;

  return { createDocument, createKnowledge, attachContent };
}

describe('SyncInputConnectorHandler', () => {
  it('captures new items and is idempotent on a second run against unchanged content', async () => {
    const knowledgeReads = new FakeKnowledgeReadModel([]);
    const { createDocument, createKnowledge, attachContent } = buildFakeHandlers(knowledgeReads);
    const items: CapturedItem[] = [
      { title: 'repo-a — README', body: 'content a', mimeType: 'text/markdown', sourceUrl: 'https://x/a' },
      { title: 'repo-b — README', body: 'content b', mimeType: 'text/markdown', sourceUrl: 'https://x/b' },
    ];
    const connectors = new CapabilityRegistry<InputConnector>('InputConnector');
    connectors.register('input.test-source', new FakeConnector(items));

    const handler = new SyncInputConnectorHandler(
      connectors,
      createDocument,
      createKnowledge,
      attachContent,
      knowledgeReads,
    );

    const first = await handler.execute(
      syncInputConnectorCommand({ tenantId: TENANT_ID, capability: 'input.test-source' }),
    );
    expect(first).toEqual({ captured: 2, skipped: 0 });

    const second = await handler.execute(
      syncInputConnectorCommand({ tenantId: TENANT_ID, capability: 'input.test-source' }),
    );
    expect(second).toEqual({ captured: 0, skipped: 2 });
  });

  it('captures only the genuinely new item when one was already seen', async () => {
    const knowledgeReads = new FakeKnowledgeReadModel([]);
    const { createDocument, createKnowledge, attachContent } = buildFakeHandlers(knowledgeReads);
    const connectors = new CapabilityRegistry<InputConnector>('InputConnector');

    connectors.register(
      'input.test-source',
      new FakeConnector([
        { title: 'repo-a — README', body: 'content a', mimeType: 'text/markdown', sourceUrl: 'https://x/a' },
      ]),
    );
    const handler = new SyncInputConnectorHandler(
      connectors,
      createDocument,
      createKnowledge,
      attachContent,
      knowledgeReads,
    );
    await handler.execute(syncInputConnectorCommand({ tenantId: TENANT_ID, capability: 'input.test-source' }));

    // A second connector instance under the same capability slot would collide;
    // instead simulate "one new repo added" by building a fresh registry with both items.
    const connectorsRoundTwo = new CapabilityRegistry<InputConnector>('InputConnector');
    connectorsRoundTwo.register(
      'input.test-source',
      new FakeConnector([
        { title: 'repo-a — README', body: 'content a', mimeType: 'text/markdown', sourceUrl: 'https://x/a' },
        { title: 'repo-c — README', body: 'content c', mimeType: 'text/markdown', sourceUrl: 'https://x/c' },
      ]),
    );
    const handlerRoundTwo = new SyncInputConnectorHandler(
      connectorsRoundTwo,
      createDocument,
      createKnowledge,
      attachContent,
      knowledgeReads,
    );
    const result = await handlerRoundTwo.execute(
      syncInputConnectorCommand({ tenantId: TENANT_ID, capability: 'input.test-source' }),
    );

    expect(result).toEqual({ captured: 1, skipped: 1 });
  });
});
