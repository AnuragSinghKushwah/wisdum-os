import type { Knowledge, KnowledgeId, KnowledgeRepository, KnowledgeSlug } from '@wisdum/domain';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryKnowledgeRepository
  extends InMemoryRepository<KnowledgeId, Knowledge>
  implements KnowledgeRepository
{
  findBySlug(tenantId: TenantId, slug: KnowledgeSlug): Promise<Option<Knowledge>> {
    const found = this.values().find(
      (knowledge) => knowledge.tenantId === tenantId && knowledge.slug.equals(slug),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }
}
