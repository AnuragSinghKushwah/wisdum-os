import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { USER_CREATED, USER_SUSPENDED } from '../events/identity-events.js';
import { DisplayName } from '../value-objects/display-name.js';
import { Email } from '../value-objects/email.js';
import { RoleId, UserId } from '../value-objects/identity-ids.js';
import { User } from './user.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createUser() {
  return User.create(
    {
      id: UserId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      email: Email.create('ada@example.com'),
      displayName: DisplayName.create('Ada Lovelace'),
    },
    clock,
  );
}

describe('User', () => {
  it('is created active and raises UserCreated', () => {
    const user = createUser();
    expect(user.status.is('active')).toBe(true);
    const events = user.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe(USER_CREATED);
  });

  it('assignRole() is idempotent', () => {
    const user = createUser();
    const roleId = RoleId.create('22222222-2222-2222-2222-222222222222');

    user.assignRole(roleId, clock);
    user.assignRole(roleId, clock);

    expect(user.roleIds).toHaveLength(1);
    expect(user.hasRole(roleId)).toBe(true);
  });

  it('revokeRole() removes a previously assigned role', () => {
    const user = createUser();
    const roleId = RoleId.create('22222222-2222-2222-2222-222222222222');
    user.assignRole(roleId, clock);

    user.revokeRole(roleId, clock);

    expect(user.hasRole(roleId)).toBe(false);
    expect(user.roleIds).toHaveLength(0);
  });

  it('suspend() then reactivate() round-trips through the status machine', () => {
    const user = createUser();
    user.clearDomainEvents();

    user.suspend('policy violation', clock);
    expect(user.status.is('suspended')).toBe(true);
    expect(user.pullDomainEvents().some((event) => event.eventType === USER_SUSPENDED)).toBe(true);

    user.reactivate(clock);
    expect(user.status.is('active')).toBe(true);
  });

  it('a suspended user cannot be modified until reactivated', () => {
    const user = createUser();
    user.suspend('policy violation', clock);

    expect(() => user.rename(DisplayName.create('New Name'), clock)).toThrow(/cannot be modified/i);
  });

  it('markDeleted() is terminal', () => {
    const user = createUser();
    user.markDeleted(clock);
    expect(user.status.is('deleted')).toBe(true);
    expect(() => user.suspend('x', clock)).toThrow();
  });
});
