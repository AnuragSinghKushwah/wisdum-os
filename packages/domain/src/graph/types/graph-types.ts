/**
 * Literal vocabularies of the graph bounded context. Value objects wrap
 * and validate these; the raw values appear in event payloads.
 */

export const CONCEPT_RELATIONSHIP_TYPES = ['co_occurs'] as const;
export type ConceptRelationshipTypeValue = (typeof CONCEPT_RELATIONSHIP_TYPES)[number];
