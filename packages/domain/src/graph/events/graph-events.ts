import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type { ConceptRelationshipTypeValue } from '../types/graph-types.js';

/**
 * Domain events of the graph bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const GRAPH_EVENT_SCHEMA_VERSION = 1;

export const CONCEPT_CREATED = 'graph.concept.created';
export const CONCEPT_MENTIONED = 'graph.concept.mentioned';
export const CONCEPT_RELATIONSHIP_DETECTED = 'graph.concept-relationship.detected';

type GraphEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface ConceptCreatedPayload {
  readonly conceptId: UUID;
  readonly name: string;
}
export type ConceptCreated = GraphEvent<typeof CONCEPT_CREATED, ConceptCreatedPayload>;

export interface ConceptMentionedPayload {
  readonly conceptMentionId: UUID;
  readonly conceptId: UUID;
  readonly knowledgeId: UUID;
}
export type ConceptMentioned = GraphEvent<typeof CONCEPT_MENTIONED, ConceptMentionedPayload>;

export interface ConceptRelationshipDetectedPayload {
  readonly conceptRelationshipId: UUID;
  readonly conceptAId: UUID;
  readonly conceptBId: UUID;
  readonly relationshipType: ConceptRelationshipTypeValue;
}
export type ConceptRelationshipDetected = GraphEvent<
  typeof CONCEPT_RELATIONSHIP_DETECTED,
  ConceptRelationshipDetectedPayload
>;

export type AnyGraphEvent = ConceptCreated | ConceptMentioned | ConceptRelationshipDetected;
