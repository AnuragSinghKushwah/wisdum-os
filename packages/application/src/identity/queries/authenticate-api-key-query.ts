import type { Query } from '../../shared/messages.js';

/** Resolves a presented API key to the identity and scopes it carries. */
export interface AuthenticateApiKeyQuery extends Query {
  readonly kind: 'query';
  readonly plaintextKey: string;
}

export function authenticateApiKeyQuery(
  props: Omit<AuthenticateApiKeyQuery, 'kind'>,
): AuthenticateApiKeyQuery {
  return { kind: 'query', ...props };
}
