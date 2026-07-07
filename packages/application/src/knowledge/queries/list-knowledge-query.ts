import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface ListKnowledgeQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly status?: string;
}

export function listKnowledgeQuery(props: Omit<ListKnowledgeQuery, 'kind'>): ListKnowledgeQuery {
  return { kind: 'query', ...props };
}
