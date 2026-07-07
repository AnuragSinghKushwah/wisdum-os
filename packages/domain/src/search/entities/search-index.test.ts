import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { SEARCH_INDEX_CREATED } from '../events/search-events.js';
import { SearchIndexId } from '../value-objects/search-index-id.js';
import { SearchIndex } from './search-index.js';

const TENANT_ID = 'tenant-1' as TenantId;
const SOURCE_ID = '99999999-9999-9999-9999-999999999999' as UUID;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createIndex() {
  return SearchIndex.create(
    {
      id: SearchIndexId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      name: 'knowledge-main',
      mode: 'hybrid',
    },
    clock,
  );
}

describe('SearchIndex', () => {
  it('is created active with a balanced ranking and raises SearchIndexCreated', () => {
    const index = createIndex();
    expect(index.isReady()).toBe(true);
    expect(index.ranking.keywordWeight).toBe(0.5);
    expect(index.ranking.semanticWeight).toBe(0.5);

    const events = index.pullDomainEvents();
    expect(events.some((event) => event.eventType === SEARCH_INDEX_CREATED)).toBe(true);
  });

  it('recordDocumentIndexed() adds the source to the index', () => {
    const index = createIndex();
    index.recordDocumentIndexed(
      { sourceId: SOURCE_ID, sourceType: 'knowledge', chunkCount: 3 },
      clock,
    );

    expect(index.containsSource(SOURCE_ID)).toBe(true);
    expect(index.documentCount()).toBe(1);
    expect(index.documents[0]?.state).toBe('indexed');
  });

  it('recordDocumentFailed() marks the source failed without removing it', () => {
    const index = createIndex();
    index.recordDocumentFailed({ sourceId: SOURCE_ID, sourceType: 'knowledge' }, clock);

    expect(index.containsSource(SOURCE_ID)).toBe(true);
    expect(index.documents[0]?.state).toBe('failed');
  });

  it('removeDocument() drops a source from the index', () => {
    const index = createIndex();
    index.recordDocumentIndexed(
      { sourceId: SOURCE_ID, sourceType: 'knowledge', chunkCount: 1 },
      clock,
    );

    index.removeDocument(SOURCE_ID, clock);

    expect(index.containsSource(SOURCE_ID)).toBe(false);
  });

  it('startRebuild() clears membership until completeRebuild() finishes', () => {
    const index = createIndex();
    index.recordDocumentIndexed(
      { sourceId: SOURCE_ID, sourceType: 'knowledge', chunkCount: 1 },
      clock,
    );

    index.startRebuild(clock);

    expect(index.documentCount()).toBe(0);
    expect(index.isReady()).toBe(false);

    index.completeRebuild(clock);
    expect(index.isReady()).toBe(true);
  });

  it('completeRebuild() without a preceding startRebuild() throws', () => {
    const index = createIndex();
    expect(() => index.completeRebuild(clock)).toThrow(/not rebuilding/i);
  });

  it('markDeleted() clears membership and blocks further changes', () => {
    const index = createIndex();
    index.recordDocumentIndexed(
      { sourceId: SOURCE_ID, sourceType: 'knowledge', chunkCount: 1 },
      clock,
    );

    index.markDeleted(clock);

    expect(index.documentCount()).toBe(0);
    expect(() =>
      index.recordDocumentIndexed(
        { sourceId: SOURCE_ID, sourceType: 'knowledge', chunkCount: 1 },
        clock,
      ),
    ).toThrow(/cannot be modified/i);
  });
});
