import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface ListApiKeysQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function listApiKeysQuery(props: Omit<ListApiKeysQuery, 'kind'>): ListApiKeysQuery {
  return { kind: 'query', ...props };
}
