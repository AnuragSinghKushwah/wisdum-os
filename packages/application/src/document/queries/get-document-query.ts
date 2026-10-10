import type { TenantId } from '@wisdum/types';
import type { Query } from '../../shared/messages.js';

export interface GetDocumentQuery extends Query {
  readonly kind: 'query';
  readonly tenantId: TenantId;
  readonly documentId: string;
}

export function getDocumentQuery(props: Omit<GetDocumentQuery, 'kind'>): GetDocumentQuery {
  return { kind: 'query', ...props };
}
