import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Search capability: full-text and semantic search behind a search-provider
 * abstraction (Meilisearch is the default provider per ADR 0003).
 */
export const searchCapability: PlatformCapability = {
  name: 'search',
  description: 'Full-text and semantic search behind a search-provider abstraction.',
};

export * from './chunker/index.js';
export * from './vector-store/index.js';
export * from './embedding/index.js';
export * from './ranking/index.js';
export * from './retriever/index.js';
export * from './hybrid/index.js';
export * from './indexer/index.js';
