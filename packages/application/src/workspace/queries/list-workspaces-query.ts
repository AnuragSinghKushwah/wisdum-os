import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface ListWorkspacesQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function listWorkspacesQuery(props: Omit<ListWorkspacesQuery, 'kind'>): ListWorkspacesQuery {
  return { kind: 'query', ...props };
}
