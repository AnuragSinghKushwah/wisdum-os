import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetGraphNeighborsQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly conceptId: string;
  readonly depth?: number;
}

export function getGraphNeighborsQuery(
  tenantId: TenantId,
  conceptId: string,
  depth = 1,
): GetGraphNeighborsQuery {
  return {
    kind: 'query',
    tenantId,
    conceptId,
    depth,
  };
}
