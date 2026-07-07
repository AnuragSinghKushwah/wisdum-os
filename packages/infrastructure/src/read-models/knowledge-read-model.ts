import { KnowledgeId } from '@wisdum/domain';
import type { KnowledgeDto, KnowledgeReadModel } from '@wisdum/application';
import { toKnowledgeDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { InMemoryKnowledgeRepository } from '../persistence/knowledge-repository.js';

/** Reads directly off the in-memory repository. A real deployment would read a projection table instead. */
export class InMemoryKnowledgeReadModel implements KnowledgeReadModel {
  constructor(private readonly repository: InMemoryKnowledgeRepository) {}

  async findById(tenantId: TenantId, knowledgeId: string): Promise<KnowledgeDto | undefined> {
    const found = await this.repository.findById(KnowledgeId.create(knowledgeId));
    return found.some && found.value.tenantId === tenantId
      ? toKnowledgeDto(found.value)
      : undefined;
  }

  listByTenant(tenantId: TenantId, status?: string): Promise<readonly KnowledgeDto[]> {
    const dtos = this.repository
      .all()
      .filter((knowledge) => knowledge.tenantId === tenantId)
      .filter((knowledge) => status === undefined || knowledge.status.value === status)
      .map(toKnowledgeDto);
    return Promise.resolve(dtos);
  }
}
