import { KnowledgeId } from '@wisdum/domain';
import type { KnowledgeDto, KnowledgeReadModel } from '@wisdum/application';
import { toKnowledgeDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { PostgresKnowledgeRepository } from '../../persistence/postgres/knowledge-repository.postgres.js';

/** Reads off the Postgres write-side repository directly; no separate projection table yet. */
export class PostgresKnowledgeReadModel implements KnowledgeReadModel {
  constructor(private readonly repository: PostgresKnowledgeRepository) {}

  async findById(tenantId: TenantId, knowledgeId: string): Promise<KnowledgeDto | undefined> {
    const found = await this.repository.findById(KnowledgeId.create(knowledgeId));
    return found.some && found.value.tenantId === tenantId
      ? toKnowledgeDto(found.value)
      : undefined;
  }

  async listByTenant(tenantId: TenantId, status?: string): Promise<readonly KnowledgeDto[]> {
    const knowledgeAssets = await this.repository.listByTenant(tenantId, status);
    return knowledgeAssets.map(toKnowledgeDto);
  }
}
