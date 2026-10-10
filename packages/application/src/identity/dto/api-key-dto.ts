import type { ApiKey } from '@wisdum/domain';

export interface ApiKeyDto {
  readonly id: string;
  readonly label: string;
  readonly status: 'active' | 'revoked';
  readonly scopes: readonly string[];
  readonly expiresAt?: string;
  readonly createdAt: string;
}

export function toApiKeyDto(apiKey: ApiKey): ApiKeyDto {
  return {
    id: apiKey.getId().value(),
    label: apiKey.label,
    status: apiKey.status,
    scopes: apiKey.scopes.map((scope) => scope.value),
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
}
