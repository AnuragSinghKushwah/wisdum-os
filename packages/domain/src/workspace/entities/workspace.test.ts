import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { WORKSPACE_CREATED } from '../events/workspace-events.js';
import { WorkspaceLimits } from '../value-objects/workspace-limits.js';
import { WorkspaceId } from '../value-objects/workspace-id.js';
import { WorkspaceName } from '../value-objects/workspace-name.js';
import { WorkspaceSlug } from '../value-objects/workspace-slug.js';
import { Workspace } from './workspace.js';

const TENANT_ID = 'tenant-1' as TenantId;
const ORG_ID = '99999999-9999-9999-9999-999999999999' as UUID;
const OWNER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createWorkspace(limits?: WorkspaceLimits) {
  return Workspace.create(
    {
      id: WorkspaceId.create('22222222-2222-2222-2222-222222222222'),
      tenantId: TENANT_ID,
      organizationId: ORG_ID,
      name: WorkspaceName.create('Engineering'),
      slug: WorkspaceSlug.create('engineering'),
      createdBy: OWNER_ID,
      limits,
    },
    clock,
  );
}

describe('Workspace', () => {
  it('is created active with its creator as the sole owner', () => {
    const workspace = createWorkspace();
    expect(workspace.status.is('active')).toBe(true);
    expect(workspace.memberCount()).toBe(1);
    expect(workspace.isMember(OWNER_ID)).toBe(true);

    const events = workspace.pullDomainEvents();
    expect(events.some((event) => event.eventType === WORKSPACE_CREATED)).toBe(true);
  });

  it('addMember() adds a new member and is idempotent for the same user', () => {
    const workspace = createWorkspace();
    const memberId = '33333333-3333-3333-3333-333333333333' as UUID;

    workspace.addMember(memberId, 'member', clock);
    workspace.addMember(memberId, 'admin', clock);

    expect(workspace.memberCount()).toBe(2);
  });

  it('addMember() rejects new members once the member limit is reached', () => {
    const workspace = createWorkspace(WorkspaceLimits.create({ maxMembers: 1 }));
    const memberId = '33333333-3333-3333-3333-333333333333' as UUID;

    expect(() => workspace.addMember(memberId, 'member', clock)).toThrow(/limit/i);
  });

  it('removeMember() refuses to remove the last owner', () => {
    const workspace = createWorkspace();
    expect(() => workspace.removeMember(OWNER_ID, clock)).toThrow(/at least one owner/i);
  });

  it('removeMember() succeeds once another owner exists', () => {
    const workspace = createWorkspace();
    const secondOwner = '33333333-3333-3333-3333-333333333333' as UUID;
    workspace.addMember(secondOwner, 'owner', clock);

    workspace.removeMember(OWNER_ID, clock);

    expect(workspace.isMember(OWNER_ID)).toBe(false);
    expect(workspace.memberCount()).toBe(1);
  });

  it('changeMemberRole() refuses to demote the last owner', () => {
    const workspace = createWorkspace();
    expect(() => workspace.changeMemberRole(OWNER_ID, 'member', clock)).toThrow(
      /at least one owner/i,
    );
  });

  it('setSetting()/removeSetting() round-trip a workspace setting', () => {
    const workspace = createWorkspace();
    workspace.setSetting('theme', 'dark', clock);
    expect(workspace.settings.get('theme')).toBe('dark');

    workspace.removeSetting('theme', clock);
    expect(workspace.settings.has('theme')).toBe(false);
  });

  it('archive() then restore() round-trips the lifecycle', () => {
    const workspace = createWorkspace();
    workspace.archive(clock);
    expect(workspace.status.is('archived')).toBe(true);

    workspace.restore(clock);
    expect(workspace.status.is('active')).toBe(true);
  });
});
