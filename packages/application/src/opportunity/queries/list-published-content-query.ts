import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

/** Authenticated, tenant-scoped listing — distinct from the public single-item Measure route. */
export interface ListPublishedContentQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function listPublishedContentQuery(
  props: Omit<ListPublishedContentQuery, 'kind'>,
): ListPublishedContentQuery {
  return { kind: 'query', ...props };
}
