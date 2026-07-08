import type { SearchIndexer } from '@wisdum/application';
import type { SearchProvider } from './search-provider.js';

/** Bridges the application's SearchIndexer port onto a raw SearchProvider. */
export class ProviderSearchIndexer implements SearchIndexer {
  constructor(private readonly provider: SearchProvider) {}

  index(indexName: string, documentId: string, text: string): Promise<void> {
    return this.provider.index(indexName, documentId, text);
  }

  remove(indexName: string, documentId: string): Promise<void> {
    return this.provider.remove(indexName, documentId);
  }
}
