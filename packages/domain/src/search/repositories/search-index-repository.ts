import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { SearchIndex } from '../entities/search-index.js';
import type { SearchIndexId } from '../value-objects/search-index-id.js';

/**
 * Persistence port of the SearchIndex aggregate. Interface only — the
 * implementation lives outside the domain (ADR 0007). Query execution is
 * not a repository concern; it belongs to the search runtime's provider
 * interfaces.
 */
export interface SearchIndexRepository extends Repository<SearchIndex> {
  findById(id: SearchIndexId): Promise<Option<SearchIndex>>;
  /** Index names are unique per tenant. */
  findByName(tenantId: TenantId, name: string): Promise<Option<SearchIndex>>;
  findAll(tenantId: TenantId): Promise<readonly SearchIndex[]>;
  save(index: SearchIndex): Promise<void>;
  delete(index: SearchIndex): Promise<void>;
}
