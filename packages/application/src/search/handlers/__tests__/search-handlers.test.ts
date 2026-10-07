import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { some, none } from '@wisdum/types';
import { SearchIndexId } from '@wisdum/domain';
import type { SearchIndexRepository, Clock, SearchResult, SearchIndex } from '@wisdum/domain';
import { createSearchIndexCommand } from '../../commands/create-search-index-command.js';
import { indexSearchDocumentCommand } from '../../commands/index-search-document-command.js';
import { searchIndexQuery } from '../../queries/search-query.js';
import { getSearchIndexQuery } from '../../queries/get-search-index-query.js';
import { CreateSearchIndexHandler } from '../create-search-index-handler.js';
import { IndexSearchDocumentHandler } from '../index-search-document-handler.js';
import { SearchIndexHandler } from '../search-index-handler.js';
import { GetSearchIndexHandler } from '../get-search-index-handler.js';
import type { SearchIndexReadModel } from '../../ports/search-index-read-model.js';
import type { SearchIndexer } from '../../ports/search-indexer.js';
import type { SearchQueryExecutor } from '../../ports/search-query-executor.js';
import type { SearchIndexDto } from '../../dto/search-index-dto.js';
import type { DomainEventPublisher } from '../../../shared/ports.js';

class FakeSearchIndexRepository implements SearchIndexRepository {
  public items = new Map<string, SearchIndex>();

  async save(searchIndex: SearchIndex): Promise<void> {
    this.items.set(searchIndex.getId().value(), searchIndex);
  }

  async findById(id: SearchIndexId): Promise<Option<SearchIndex>> {
    const item = this.items.get(id.value());
    if (item === undefined) return none;
    return some(item);
  }

  async findByName(tenantId: TenantId, name: string): Promise<Option<SearchIndex>> {
    const item = Array.from(this.items.values()).find(
      (idx) => idx.tenantId === tenantId && idx.name === name,
    );
    if (item === undefined) return none;
    return some(item);
  }

  async findAll(tenantId: TenantId): Promise<readonly SearchIndex[]> {
    return Array.from(this.items.values()).filter((idx) => idx.tenantId === tenantId);
  }

  async delete(): Promise<void> {}
  async listByTenant(): Promise<readonly SearchIndex[]> {
    return [];
  }
}

class FakeSearchIndexer implements SearchIndexer {
  public indexedDocs: { searchIndexId: string; sourceId: string; text: string }[] = [];

  async index(searchIndexId: string, sourceId: string, text: string): Promise<void> {
    this.indexedDocs.push({ searchIndexId, sourceId, text });
  }

  async remove(): Promise<void> {}
}

class FakeSearchQueryExecutor implements SearchQueryExecutor {
  async execute(): Promise<readonly SearchResult[]> {
    return [
      { documentId: 'doc-1', snippet: 'Result 1', score: 0.95 } as unknown as SearchResult,
      { documentId: 'doc-2', snippet: 'Result 2', score: 0.88 } as unknown as SearchResult,
    ];
  }
}

class FakeSearchIndexReadModel implements SearchIndexReadModel {
  constructor(private repo: FakeSearchIndexRepository) {}

  async findById(id: string): Promise<SearchIndexDto | undefined> {
    const opt = await this.repo.findById(SearchIndexId.create(id));
    if (!opt.some) return undefined;
    const idx = (opt as { value: SearchIndex }).value;
    return {
      id: idx.getId().value(),
      name: idx.name,
      mode: idx.mode,
      status: idx.status,
      documentCount: idx.documentCount(),
      createdAt: idx.createdAt,
    };
  }

  async listByTenant(): Promise<readonly SearchIndexDto[]> {
    return [];
  }
}

const mockClock: Clock = {
  now: () => '2026-07-27T12:00:00.000Z' as IsoTimestamp,
};

const mockIdGenerator = {
  nextId: () => '00000000-0000-4000-8000-000000000001' as UUID,
};

const mockEvents: DomainEventPublisher = {
  publishAll: async () => {},
};

describe('Search Handlers', () => {
  it('CreateSearchIndexHandler creates and persists search index', async () => {
    const repo = new FakeSearchIndexRepository();
    const handler = new CreateSearchIndexHandler(repo, mockIdGenerator, mockEvents, mockClock);

    const result = await handler.execute(
      createSearchIndexCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        name: 'knowledge-index',
        mode: 'hybrid',
      }),
    );

    expect(result.searchIndexId).toBe('00000000-0000-4000-8000-000000000001');
    const idx = repo.items.get(result.searchIndexId);
    expect(idx?.name).toBe('knowledge-index');
  });

  it('IndexSearchDocumentHandler delegates document indexing to SearchIndexer', async () => {
    const repo = new FakeSearchIndexRepository();
    const indexer = new FakeSearchIndexer();
    const createHandler = new CreateSearchIndexHandler(
      repo,
      mockIdGenerator,
      mockEvents,
      mockClock,
    );
    const indexHandler = new IndexSearchDocumentHandler(repo, indexer, mockEvents, mockClock);

    const { searchIndexId } = await createHandler.execute(
      createSearchIndexCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        name: 'knowledge-index',
        mode: 'hybrid',
      }),
    );

    await indexHandler.execute(
      indexSearchDocumentCommand({
        searchIndexId,
        sourceId: '00000000-0000-4000-8000-000000000099',
        sourceType: 'document',
        text: 'Sample knowledge text to index',
      }),
    );

    expect(indexer.indexedDocs.length).toBe(1);
    expect(indexer.indexedDocs[0]?.text).toBe('Sample knowledge text to index');
  });

  it('SearchIndexHandler delegates search query execution to SearchQueryExecutor', async () => {
    const executor = new FakeSearchQueryExecutor();
    const handler = new SearchIndexHandler(executor);

    const results = await handler.execute(
      searchIndexQuery({
        searchIndexId: 'index-001',
        text: 'vector database architecture',
      }),
    );

    expect(results.length).toBe(2);
  });

  it('GetSearchIndexHandler retrieves search index metadata DTO', async () => {
    const repo = new FakeSearchIndexRepository();
    const readModel = new FakeSearchIndexReadModel(repo);
    const createHandler = new CreateSearchIndexHandler(
      repo,
      mockIdGenerator,
      mockEvents,
      mockClock,
    );
    const getHandler = new GetSearchIndexHandler(readModel);

    const { searchIndexId } = await createHandler.execute(
      createSearchIndexCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        name: 'vector-index',
        mode: 'semantic',
      }),
    );

    const dto = await getHandler.execute(
      getSearchIndexQuery({
        searchIndexId,
      }),
    );

    expect(dto).not.toBeUndefined();
    expect(dto?.name).toBe('vector-index');
  });
});
