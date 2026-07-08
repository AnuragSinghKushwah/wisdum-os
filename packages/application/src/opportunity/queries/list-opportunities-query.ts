import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface ListOpportunitiesQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function listOpportunitiesQuery(
  props: Omit<ListOpportunitiesQuery, 'kind'>,
): ListOpportunitiesQuery {
  return { kind: 'query', ...props };
}
