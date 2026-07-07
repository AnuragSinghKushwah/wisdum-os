import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { Workspace } from '../entities/workspace.js';
import { WorkspaceId } from '../value-objects/workspace-id.js';
import { WorkspaceName } from '../value-objects/workspace-name.js';
import { WorkspaceSlug } from '../value-objects/workspace-slug.js';
import { WorkspaceIsActive, WorkspaceHasMember } from './workspace-specifications.js';

const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };
const OWNER_ID = '11111111-1111-1111-1111-111111111111' as UUID;

function createWorkspace() {
  return Workspace.create(
    {
      id: WorkspaceId.create('22222222-2222-2222-2222-222222222222'),
      tenantId: 'tenant-1' as TenantId,
      organizationId: '99999999-9999-9999-9999-999999999999' as UUID,
      name: WorkspaceName.create('Engineering'),
      slug: WorkspaceSlug.create('engineering'),
      createdBy: OWNER_ID,
    },
    clock,
  );
}

describe('Workspace specifications', () => {
  it('WorkspaceIsActive is satisfied for a freshly created workspace', () => {
    expect(new WorkspaceIsActive().isSatisfiedBy(createWorkspace())).toBe(true);
  });

  it('WorkspaceIsActive is not satisfied once archived', () => {
    const workspace = createWorkspace();
    workspace.archive(clock);
    expect(new WorkspaceIsActive().isSatisfiedBy(workspace)).toBe(false);
  });

  it('WorkspaceHasMember reflects current membership', () => {
    const workspace = createWorkspace();
    const outsider = '33333333-3333-3333-3333-333333333333' as UUID;

    expect(new WorkspaceHasMember(OWNER_ID).isSatisfiedBy(workspace)).toBe(true);
    expect(new WorkspaceHasMember(outsider).isSatisfiedBy(workspace)).toBe(false);
  });
});
