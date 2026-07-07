import type { Query } from '../../shared/messages.js';

export interface GetWorkspaceQuery extends Query {
  readonly kind: 'query';
  readonly workspaceId: string;
}

export function getWorkspaceQuery(props: Omit<GetWorkspaceQuery, 'kind'>): GetWorkspaceQuery {
  return { kind: 'query', ...props };
}
