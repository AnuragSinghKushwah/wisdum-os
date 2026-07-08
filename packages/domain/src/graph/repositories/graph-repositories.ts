import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { Concept } from '../entities/concept.js';
import type { ConceptMention } from '../entities/concept-mention.js';
import type { ConceptRelationship } from '../entities/concept-relationship.js';
import type {
  ConceptId,
  ConceptMentionId,
  ConceptRelationshipId,
} from '../value-objects/graph-ids.js';
import type { ConceptName } from '../value-objects/concept-name.js';
import type { ConceptRelationshipType } from '../value-objects/concept-relationship-type.js';

/**
 * Persistence port of the Concept aggregate. `findByName` enables
 * tenant-scoped dedup by normalized name before creating a duplicate node.
 */
export interface ConceptRepository extends Repository<Concept> {
  findById(id: ConceptId): Promise<Option<Concept>>;
  findByName(tenantId: TenantId, name: ConceptName): Promise<Option<Concept>>;
  listByTenant(tenantId: TenantId): Promise<readonly Concept[]>;
  save(concept: Concept): Promise<void>;
  delete(concept: Concept): Promise<void>;
}

/** Persistence port of the ConceptMention aggregate (Knowledge -> Concept edge). */
export interface ConceptMentionRepository extends Repository<ConceptMention> {
  findById(id: ConceptMentionId): Promise<Option<ConceptMention>>;
  findExisting(
    tenantId: TenantId,
    conceptId: ConceptId,
    knowledgeId: string,
  ): Promise<Option<ConceptMention>>;
  listByConcept(tenantId: TenantId, conceptId: ConceptId): Promise<readonly ConceptMention[]>;
  save(mention: ConceptMention): Promise<void>;
  delete(mention: ConceptMention): Promise<void>;
}

/** Persistence port of the ConceptRelationship aggregate (Concept <-> Concept edge). */
export interface ConceptRelationshipRepository extends Repository<ConceptRelationship> {
  findById(id: ConceptRelationshipId): Promise<Option<ConceptRelationship>>;
  findExisting(
    tenantId: TenantId,
    conceptAId: ConceptId,
    conceptBId: ConceptId,
    relationshipType: ConceptRelationshipType,
  ): Promise<Option<ConceptRelationship>>;
  listByTenant(tenantId: TenantId): Promise<readonly ConceptRelationship[]>;
  save(relationship: ConceptRelationship): Promise<void>;
  delete(relationship: ConceptRelationship): Promise<void>;
}
