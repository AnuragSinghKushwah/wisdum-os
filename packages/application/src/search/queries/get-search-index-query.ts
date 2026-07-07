import type { Query } from '../../shared/messages.js';

export interface GetSearchIndexQuery extends Query {
  readonly kind: 'query';
  readonly searchIndexId: string;
}

export function getSearchIndexQuery(props: Omit<GetSearchIndexQuery, 'kind'>): GetSearchIndexQuery {
  return { kind: 'query', ...props };
}
