import type { Query } from '../../shared/messages.js';

export interface GetOrganizationQuery extends Query {
  readonly kind: 'query';
  readonly organizationId: string;
}

export function getOrganizationQuery(
  props: Omit<GetOrganizationQuery, 'kind'>,
): GetOrganizationQuery {
  return { kind: 'query', ...props };
}
