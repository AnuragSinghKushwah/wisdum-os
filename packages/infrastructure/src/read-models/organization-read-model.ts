import type { TenantId } from '@wisdum/types';
import { OrganizationId } from '@wisdum/domain';
import type { OrganizationDto, OrganizationReadModel } from '@wisdum/application';
import { toOrganizationDto } from '@wisdum/application';
import type { InMemoryOrganizationRepository } from '../persistence/organization-repository.js';

export class InMemoryOrganizationReadModel implements OrganizationReadModel {
  constructor(private readonly repository: InMemoryOrganizationRepository) {}

  async findById(tenantId: TenantId, organizationId: string): Promise<OrganizationDto | undefined> {
    const found = await this.repository.findById(OrganizationId.create(organizationId));
    return found.some && found.value.tenantId === tenantId
      ? toOrganizationDto(found.value)
      : undefined;
  }
}
