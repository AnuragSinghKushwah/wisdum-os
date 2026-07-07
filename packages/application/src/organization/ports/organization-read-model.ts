import type { OrganizationDto } from '../dto/organization-dto.js';

export interface OrganizationReadModel {
  findById(organizationId: string): Promise<OrganizationDto | undefined>;
}
