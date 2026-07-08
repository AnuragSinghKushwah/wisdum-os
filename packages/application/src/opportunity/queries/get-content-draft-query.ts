import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetContentDraftQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly draftId: string;
}

export function getContentDraftQuery(
  props: Omit<GetContentDraftQuery, 'kind'>,
): GetContentDraftQuery {
  return { kind: 'query', ...props };
}
