import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { OrganizationDto } from '../dto/organization-dto.js';
import type { OrganizationReadModel } from '../ports/organization-read-model.js';
import type { GetOrganizationQuery } from '../queries/get-organization-query.js';

export class GetOrganizationHandler implements QueryHandler<GetOrganizationQuery, OrganizationDto> {
  constructor(private readonly reads: OrganizationReadModel) {}

  async execute(query: GetOrganizationQuery): Promise<OrganizationDto> {
    const dto = await this.reads.findById(query.tenantId, query.organizationId);
    if (dto === undefined) {
      throw new NotFoundError('Organization not found', { organizationId: query.organizationId });
    }
    return dto;
  }
}
