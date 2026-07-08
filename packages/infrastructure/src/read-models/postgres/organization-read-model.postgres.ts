import { OrganizationId } from '@wisdum/domain';
import type { OrganizationDto, OrganizationReadModel } from '@wisdum/application';
import { toOrganizationDto } from '@wisdum/application';
import type { PostgresOrganizationRepository } from '../../persistence/postgres/organization-repository.postgres.js';

export class PostgresOrganizationReadModel implements OrganizationReadModel {
  constructor(private readonly repository: PostgresOrganizationRepository) {}

  async findById(organizationId: string): Promise<OrganizationDto | undefined> {
    const found = await this.repository.findById(OrganizationId.create(organizationId));
    return found.some ? toOrganizationDto(found.value) : undefined;
  }
}
