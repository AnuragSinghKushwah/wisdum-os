import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface ListPluginsQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function listPluginsQuery(props: Omit<ListPluginsQuery, 'kind'>): ListPluginsQuery {
  return { kind: 'query', ...props };
}
