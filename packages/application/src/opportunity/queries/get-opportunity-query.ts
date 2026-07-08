import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetOpportunityQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly opportunityId: string;
}

export function getOpportunityQuery(
  props: Omit<GetOpportunityQuery, 'kind'>,
): GetOpportunityQuery {
  return { kind: 'query', ...props };
}
