import type { Query } from '../../shared/messages.js';

/**
 * The Measure step (Product Bible §11): fetch a published piece by its
 * (globally unique) id and record a view. Deliberately not tenant-scoped —
 * this backs the public, unauthenticated route.
 */
export interface GetPublishedContentQuery extends Query {
  readonly kind: 'query';
  readonly publishedContentId: string;
}

export function getPublishedContentQuery(
  props: Omit<GetPublishedContentQuery, 'kind'>,
): GetPublishedContentQuery {
  return { kind: 'query', ...props };
}
