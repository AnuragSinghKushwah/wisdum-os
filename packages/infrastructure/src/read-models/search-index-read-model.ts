import type { TenantId } from '@wisdum/types';
import { SearchIndexId } from '@wisdum/domain';
import type { SearchIndexDto, SearchIndexReadModel } from '@wisdum/application';
import { toSearchIndexDto } from '@wisdum/application';
import type { InMemorySearchIndexRepository } from '../persistence/search-index-repository.js';

export class InMemorySearchIndexReadModel implements SearchIndexReadModel {
  constructor(private readonly repository: InMemorySearchIndexRepository) {}

  async findById(tenantId: TenantId, searchIndexId: string): Promise<SearchIndexDto | undefined> {
    const found = await this.repository.findById(SearchIndexId.create(searchIndexId));
    return found.some && found.value.tenantId === tenantId
      ? toSearchIndexDto(found.value)
      : undefined;
  }
}
