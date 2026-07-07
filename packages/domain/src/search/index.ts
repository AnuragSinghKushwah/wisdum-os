import type { DomainDescriptor } from '../shared/index.js';

/** Search bounded context — index membership, ranking policy, query and result models. */
export const searchDomain: DomainDescriptor = {
  name: 'search',
  description: 'Search indexes, indexed documents, queries, results, and ranking.',
};

export * from './types/search-types.js';
export * from './value-objects/search-index-id.js';
export * from './value-objects/chunk-reference.js';
export * from './value-objects/embedding-reference.js';
export * from './value-objects/search-document.js';
export * from './value-objects/search-query.js';
export * from './value-objects/search-ranking.js';
export * from './value-objects/search-result.js';
export * from './events/search-events.js';
export * from './entities/search-index.js';
export * from './repositories/search-index-repository.js';
export * from './specifications/search-specifications.js';
