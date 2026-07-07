import type { QueryHandler } from '../../shared/messages.js';
import type { KnowledgeDto } from '../dto/knowledge-dto.js';
import type { KnowledgeReadModel } from '../ports/knowledge-read-model.js';
import type { ListKnowledgeQuery } from '../queries/list-knowledge-query.js';

export class ListKnowledgeHandler implements QueryHandler<
  ListKnowledgeQuery,
  readonly KnowledgeDto[]
> {
  constructor(private readonly reads: KnowledgeReadModel) {}

  execute(query: ListKnowledgeQuery): Promise<readonly KnowledgeDto[]> {
    return this.reads.listByTenant(query.tenantId, query.status);
  }
}
