import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

/** Application-level query message; the domain's SearchQuery is built inside the handler. */
export interface SearchIndexQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly searchIndexId: string;
  readonly text: string;
  readonly mode?: 'keyword' | 'semantic' | 'hybrid';
  readonly limit?: number;
  readonly offset?: number;
}

export function searchIndexQuery(props: Omit<SearchIndexQuery, 'kind'>): SearchIndexQuery {
  return { kind: 'query', ...props };
}
