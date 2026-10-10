import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetUserQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly userId: string;
}

export function getUserQuery(props: Omit<GetUserQuery, 'kind'>): GetUserQuery {
  return { kind: 'query', ...props };
}
