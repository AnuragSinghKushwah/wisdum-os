import type { ApiKeyDto, ApiKeyReadModel } from '@wisdum/application';
import { toApiKeyDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { InMemoryApiKeyRepository } from '../persistence/identity-repositories.js';

export class InMemoryApiKeyReadModel implements ApiKeyReadModel {
  constructor(private readonly repository: InMemoryApiKeyRepository) {}

  listByTenant(tenantId: TenantId): Promise<readonly ApiKeyDto[]> {
    const dtos = this.repository
      .all()
      .filter((apiKey) => apiKey.tenantId === tenantId)
      .map(toApiKeyDto);
    return Promise.resolve(dtos);
  }
}
