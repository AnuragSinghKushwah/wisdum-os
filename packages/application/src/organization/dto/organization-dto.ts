import type { Organization } from '@wisdum/domain';

export interface OrganizationDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly plan: string;
  readonly workspaceCount: number;
  readonly createdAt: string;
}

export function toOrganizationDto(organization: Organization): OrganizationDto {
  return {
    id: organization.getId().value(),
    name: organization.name.value,
    slug: organization.slug.value,
    status: organization.status.value,
    plan: organization.subscription.plan,
    workspaceCount: organization.workspaceCount(),
    createdAt: organization.createdAt,
  };
}
