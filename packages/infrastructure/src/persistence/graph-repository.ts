import type {
  Concept,
  ConceptId,
  ConceptMention,
  ConceptMentionId,
  ConceptMentionRepository,
  ConceptName,
  ConceptRelationship,
  ConceptRelationshipId,
  ConceptRelationshipRepository,
  ConceptRelationshipType,
  ConceptRepository,
} from '@wisdum/domain';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryConceptRepository
  extends InMemoryRepository<ConceptId, Concept>
  implements ConceptRepository
{
  findByName(tenantId: TenantId, name: ConceptName): Promise<Option<Concept>> {
    const found = this.values().find(
      (concept) => concept.tenantId === tenantId && concept.name.equals(name),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  listByTenant(tenantId: TenantId): Promise<readonly Concept[]> {
    return Promise.resolve(this.values().filter((concept) => concept.tenantId === tenantId));
  }
}

export class InMemoryConceptMentionRepository
  extends InMemoryRepository<ConceptMentionId, ConceptMention>
  implements ConceptMentionRepository
{
  findExisting(
    tenantId: TenantId,
    conceptId: ConceptId,
    knowledgeId: string,
  ): Promise<Option<ConceptMention>> {
    const found = this.values().find(
      (mention) =>
        mention.tenantId === tenantId &&
        mention.conceptId.equals(conceptId) &&
        mention.knowledgeId === knowledgeId,
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  listByConcept(tenantId: TenantId, conceptId: ConceptId): Promise<readonly ConceptMention[]> {
    return Promise.resolve(
      this.values().filter(
        (mention) => mention.tenantId === tenantId && mention.conceptId.equals(conceptId),
      ),
    );
  }
}

export class InMemoryConceptRelationshipRepository
  extends InMemoryRepository<ConceptRelationshipId, ConceptRelationship>
  implements ConceptRelationshipRepository
{
  findExisting(
    tenantId: TenantId,
    conceptAId: ConceptId,
    conceptBId: ConceptId,
    relationshipType: ConceptRelationshipType,
  ): Promise<Option<ConceptRelationship>> {
    const found = this.values().find(
      (relationship) =>
        relationship.tenantId === tenantId &&
        relationship.conceptAId.equals(conceptAId) &&
        relationship.conceptBId.equals(conceptBId) &&
        relationship.relationshipType.equals(relationshipType),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  listByTenant(tenantId: TenantId): Promise<readonly ConceptRelationship[]> {
    return Promise.resolve(
      this.values().filter((relationship) => relationship.tenantId === tenantId),
    );
  }
}
