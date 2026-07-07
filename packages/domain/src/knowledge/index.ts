import type { DomainDescriptor } from '../shared/index.js';

/** Knowledge bounded context — canonical records of knowledge assets. */
export const knowledgeDomain: DomainDescriptor = {
  name: 'knowledge',
  description: 'Knowledge assets and the connections between them.',
};

export * from './types/knowledge-types.js';
export * from './value-objects/knowledge-id.js';
export * from './value-objects/knowledge-title.js';
export * from './value-objects/knowledge-slug.js';
export * from './value-objects/knowledge-description.js';
export * from './value-objects/knowledge-type.js';
export * from './value-objects/knowledge-status.js';
export * from './value-objects/knowledge-visibility.js';
export * from './value-objects/knowledge-source.js';
export * from './value-objects/knowledge-version.js';
export * from './value-objects/knowledge-label.js';
export * from './value-objects/content-reference.js';
export * from './events/knowledge-events.js';
export * from './entities/knowledge.js';
export * from './repositories/knowledge-repository.js';
export * from './services/knowledge-lifecycle-service.js';
export * from './specifications/knowledge-specifications.js';
