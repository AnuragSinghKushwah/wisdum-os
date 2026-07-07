import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetKnowledgeQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly knowledgeId: string;
}

export function getKnowledgeQuery(props: Omit<GetKnowledgeQuery, 'kind'>): GetKnowledgeQuery {
  return { kind: 'query', ...props };
}
