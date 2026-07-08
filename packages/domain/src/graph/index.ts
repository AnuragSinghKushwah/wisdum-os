import type { DomainDescriptor } from '../shared/index.js';

/**
 * Graph bounded context — the knowledge graph (Product Bible §7, §15):
 * Concepts (nodes) and Relationships (edges) that the reasoning pipeline
 * builds from captured knowledge. Exists purely for AI reasoning, not as
 * a user-facing visualization.
 */
export const graphDomain: DomainDescriptor = {
  name: 'graph',
  description: 'The knowledge graph: concepts, mentions, and relationships between them.',
};

export * from './types/graph-types.js';
export * from './value-objects/graph-ids.js';
export * from './value-objects/concept-name.js';
export * from './value-objects/concept-description.js';
export * from './value-objects/concept-relationship-type.js';
export * from './events/graph-events.js';
export * from './entities/concept.js';
export * from './entities/concept-mention.js';
export * from './entities/concept-relationship.js';
export * from './repositories/graph-repositories.js';
