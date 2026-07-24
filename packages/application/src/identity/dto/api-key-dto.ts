import type { ApiKey } from '@wisdum/domain';

export interface ApiKeyDto {
  readonly id: string;
  readonly label: string;
  readonly status: 'active' | 'revoked';
  readonly expiresAt?: string;
  readonly createdAt: string;
}

export function toApiKeyDto(apiKey: ApiKey): ApiKeyDto {
  return {
    id: apiKey.getId().value(),
    label: apiKey.label,
    status: apiKey.status,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
}
