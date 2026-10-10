import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId } from '@wisdum/types';
import { DisplayName, Email, PasswordHash, PermissionSet, User, UserId } from '@wisdum/domain';
import type { Clock, UserRepository } from '@wisdum/domain';
import { AccessPolicy } from '../access/access-policy.js';
import { assignRoleCommand } from '../commands/assign-role-command.js';
import { AssignRoleHandler } from './assign-role-handler.js';

const TENANT = '11111111-1111-4111-8111-111111111111' as TenantId;
const OTHER_TENANT = '99999999-9999-4999-8999-999999999999' as TenantId;
const USER_ID = '22222222-2222-4222-8222-222222222222';
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };
const access = new AccessPolicy();

class FakeUsers implements UserRepository {
  constructor(private readonly user: User) {}
  findById(id: UserId): Promise<Option<User>> {
    return Promise.resolve(id.equals(this.user.getId()) ? { some: true, value: this.user } : { some: false });
  }
  findByEmail(): Promise<Option<User>> {
    return Promise.resolve({ some: false });
  }
  exists(): Promise<boolean> {
    return Promise.resolve(true);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function setup() {
  const user = User.create(
    {
      id: UserId.create(USER_ID),
      tenantId: TENANT,
      email: Email.create('a@b.test'),
      displayName: DisplayName.create('Ada'),
      passwordHash: PasswordHash.create('x'.repeat(40)),
    },
    clock,
  );
  const handler = new AssignRoleHandler(new FakeUsers(user), access, { publishAll: () => Promise.resolve() }, clock);
  const grant = (name: 'owner' | 'admin' | 'member' | 'viewer') => access.permissionsOfSystemRole(name).toArray();
  return { user, handler, grant };
}

const command = (roleName: 'owner' | 'admin' | 'member' | 'viewer', grantor: readonly string[], tenantId = TENANT) =>
  assignRoleCommand({
    tenantId,
    userId: USER_ID,
    roleId: access.systemRoleId(TENANT, roleName),
    grantorPermissions: grantor,
  });

describe('AssignRoleHandler', () => {
  it('assigns a system role the grantor is entitled to hand out', async () => {
    const { user, handler, grant } = setup();
    await handler.execute(command('member', grant('admin')));
    expect(user.roleIds.map((id) => id.value())).toEqual([access.systemRoleId(TENANT, 'member')]);
  });

  it('lets an owner assign owner', async () => {
    const { user, handler, grant } = setup();
    await handler.execute(command('owner', grant('owner')));
    expect(user.roleIds).toHaveLength(1);
  });

  it('refuses to let an admin assign owner', async () => {
    const { user, handler, grant } = setup();
    await expect(handler.execute(command('owner', grant('admin')))).rejects.toThrow('more than you hold');
    expect(user.roleIds).toHaveLength(0);
  });

  it('refuses to let a member assign admin, and a viewer assign anything above viewer', async () => {
    const { handler, grant } = setup();
    await expect(handler.execute(command('admin', grant('member')))).rejects.toThrow('more than you hold');
    await expect(handler.execute(command('member', grant('viewer')))).rejects.toThrow('more than you hold');
  });

  it('refuses a grantor holding nothing', async () => {
    const { handler } = setup();
    await expect(handler.execute(command('viewer', []))).rejects.toThrow('more than you hold');
    expect(PermissionSet.empty().isEmpty()).toBe(true);
  });

  it('rejects a role id that is not one of the tenant\'s system roles', async () => {
    const { handler, grant } = setup();
    await expect(
      handler.execute(
        assignRoleCommand({
          tenantId: TENANT,
          userId: USER_ID,
          roleId: '33333333-3333-4333-8333-333333333333',
          grantorPermissions: grant('owner'),
        }),
      ),
    ).rejects.toThrow('Unknown role');
  });

  it('rejects another tenant\'s role id', async () => {
    const { handler, grant } = setup();
    await expect(
      handler.execute(
        assignRoleCommand({
          tenantId: TENANT,
          userId: USER_ID,
          roleId: access.systemRoleId(OTHER_TENANT, 'viewer'),
          grantorPermissions: grant('owner'),
        }),
      ),
    ).rejects.toThrow('Unknown role');
  });

  it('treats a user from another tenant as not found', async () => {
    const { handler, grant } = setup();
    await expect(handler.execute(command('viewer', grant('owner'), OTHER_TENANT))).rejects.toThrow(
      'User not found',
    );
  });
});
