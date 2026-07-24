import type { TenantDirectory } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';

/**
 * Dev/test fallback for non-Postgres mode. Returns an empty list: nothing
 * in this codebase creates `tenants` rows in-memory today, so there is no
 * in-memory tenant data to enumerate — a scheduled job iterating this
 * directory correctly does nothing rather than crashing.
 */
export class InMemoryTenantDirectory implements TenantDirectory {
  listAllTenantIds(): Promise<readonly TenantId[]> {
    return Promise.resolve([]);
  }
}
