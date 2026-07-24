import type { QueryHandler } from '../../shared/messages.js';
import type { ApiKeyDto } from '../dto/api-key-dto.js';
import type { ApiKeyReadModel } from '../ports/api-key-read-model.js';
import type { ListApiKeysQuery } from '../queries/list-api-keys-query.js';

export class ListApiKeysHandler implements QueryHandler<ListApiKeysQuery, readonly ApiKeyDto[]> {
  constructor(private readonly readModel: ApiKeyReadModel) {}

  async execute(query: ListApiKeysQuery): Promise<readonly ApiKeyDto[]> {
    return this.readModel.listByTenant(query.tenantId);
  }
}
