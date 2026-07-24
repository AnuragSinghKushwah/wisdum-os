import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface ListContentDraftsQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
}

export function listContentDraftsQuery(
  props: Omit<ListContentDraftsQuery, 'kind'>,
): ListContentDraftsQuery {
  return { kind: 'query', ...props };
}
