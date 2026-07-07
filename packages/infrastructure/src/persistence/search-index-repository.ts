import type { SearchIndex, SearchIndexId, SearchIndexRepository } from '@wisdum/domain';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemorySearchIndexRepository
  extends InMemoryRepository<SearchIndexId, SearchIndex>
  implements SearchIndexRepository
{
  findByName(tenantId: TenantId, name: string): Promise<Option<SearchIndex>> {
    const found = this.values().find((index) => index.tenantId === tenantId && index.name === name);
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findAll(tenantId: TenantId): Promise<readonly SearchIndex[]> {
    return Promise.resolve(this.values().filter((index) => index.tenantId === tenantId));
  }
}
