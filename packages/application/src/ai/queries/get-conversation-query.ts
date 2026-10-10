import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetConversationQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly conversationId: string;
}

export function getConversationQuery(
  props: Omit<GetConversationQuery, 'kind'>,
): GetConversationQuery {
  return { kind: 'query', ...props };
}
