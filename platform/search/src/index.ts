import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Search capability: full-text and semantic search behind a search-provider
 * abstraction (Meilisearch is the default provider per ADR 0003).
 */
export const searchCapability: PlatformCapability = {
  name: 'search',
  description: 'Full-text and semantic search behind a search-provider abstraction.',
};
