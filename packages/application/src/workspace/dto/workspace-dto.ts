import type { Workspace } from '@wisdum/domain';

export interface WorkspaceDto {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly memberCount: number;
  readonly createdAt: string;
}

export function toWorkspaceDto(workspace: Workspace): WorkspaceDto {
  return {
    id: workspace.getId().value(),
    organizationId: workspace.organizationId,
    name: workspace.name.value,
    slug: workspace.slug.value,
    status: workspace.status.value,
    memberCount: workspace.memberCount(),
    createdAt: workspace.createdAt,
  };
}
