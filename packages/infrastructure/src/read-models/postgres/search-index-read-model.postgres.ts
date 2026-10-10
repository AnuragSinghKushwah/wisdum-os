import type { TenantId } from '@wisdum/types';
import { SearchIndexId } from '@wisdum/domain';
import type { SearchIndexDto, SearchIndexReadModel } from '@wisdum/application';
import { toSearchIndexDto } from '@wisdum/application';
import type { PostgresSearchIndexRepository } from '../../persistence/postgres/search-index-repository.postgres.js';

export class PostgresSearchIndexReadModel implements SearchIndexReadModel {
  constructor(private readonly repository: PostgresSearchIndexRepository) {}

  async findById(tenantId: TenantId, searchIndexId: string): Promise<SearchIndexDto | undefined> {
    const found = await this.repository.findById(SearchIndexId.create(searchIndexId));
    return found.some && found.value.tenantId === tenantId
      ? toSearchIndexDto(found.value)
      : undefined;
  }
}
