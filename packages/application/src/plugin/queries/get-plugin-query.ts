import type { Query } from '../../shared/messages.js';

export interface GetPluginQuery extends Query {
  readonly kind: 'query';
  readonly pluginId: string;
}

export function getPluginQuery(props: Omit<GetPluginQuery, 'kind'>): GetPluginQuery {
  return { kind: 'query', ...props };
}
