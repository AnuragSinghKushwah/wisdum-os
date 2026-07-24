import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetGraphTopologyQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function getGraphTopologyQuery(tenantId: TenantId): GetGraphTopologyQuery {
  return {
    kind: 'query',
    tenantId,
  };
}
