import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface ListAgentTasksQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function listAgentTasksQuery(
  props: Omit<ListAgentTasksQuery, 'kind'>,
): ListAgentTasksQuery {
  return { kind: 'query', ...props };
}
