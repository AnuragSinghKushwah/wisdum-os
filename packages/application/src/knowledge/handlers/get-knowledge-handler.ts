import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { KnowledgeDto } from '../dto/knowledge-dto.js';
import type { KnowledgeReadModel } from '../ports/knowledge-read-model.js';
import type { GetKnowledgeQuery } from '../queries/get-knowledge-query.js';

export class GetKnowledgeHandler implements QueryHandler<GetKnowledgeQuery, KnowledgeDto> {
  constructor(private readonly reads: KnowledgeReadModel) {}

  async execute(query: GetKnowledgeQuery): Promise<KnowledgeDto> {
    const dto = await this.reads.findById(query.tenantId, query.knowledgeId);
    if (dto === undefined) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: query.knowledgeId });
    }
    return dto;
  }
}
