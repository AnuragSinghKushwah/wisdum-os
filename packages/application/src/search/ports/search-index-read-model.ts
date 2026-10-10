import type { TenantId } from '@wisdum/types';
import type { SearchIndexDto } from '../dto/search-index-dto.js';

export interface SearchIndexReadModel {
  /** Resolves to `undefined` for a resource that does not exist *in this tenant*. */
  findById(tenantId: TenantId, searchIndexId: string): Promise<SearchIndexDto | undefined>;
}
