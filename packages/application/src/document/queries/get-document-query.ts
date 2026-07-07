import type { Query } from '../../shared/messages.js';

export interface GetDocumentQuery extends Query {
  readonly kind: 'query';
  readonly documentId: string;
}

export function getDocumentQuery(props: Omit<GetDocumentQuery, 'kind'>): GetDocumentQuery {
  return { kind: 'query', ...props };
}
