import { describe, expect, it } from 'vitest';
import type { TenantId } from '@wisdum/types';
import { RoleId } from '@wisdum/domain';
import { AccessPolicy } from './access-policy.js';

const policy = new AccessPolicy();
const TENANT_A = '11111111-1111-4111-8111-111111111111' as TenantId;
const TENANT_B = '22222222-2222-4222-8222-222222222222' as TenantId;

describe('AccessPolicy', () => {
  it('derives stable, valid UUID role ids', () => {
    const id = policy.systemRoleId(TENANT_A, 'owner');
    expect(id).toBe(policy.systemRoleId(TENANT_A, 'owner'));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(() => RoleId.create(id)).not.toThrow();
  });

  it('gives each role in each tenant a distinct id', () => {
    const ids = new Set([
      policy.systemRoleId(TENANT_A, 'owner'),
      policy.systemRoleId(TENANT_A, 'admin'),
      policy.systemRoleId(TENANT_A, 'member'),
      policy.systemRoleId(TENANT_A, 'viewer'),
      policy.systemRoleId(TENANT_B, 'owner'),
    ]);
    expect(ids.size).toBe(5);
  });

  it('pins the derivation so existing assignments never silently change', () => {
    // Literals computed independently of this code. If one fails, role ids changed and every
    // stored assignment would stop matching.
    expect(policy.systemRoleId(TENANT_A, 'owner')).toBe('7c62b563-e29d-564a-a6f5-7a8f03d8e9db');
    expect(policy.systemRoleId(TENANT_A, 'viewer')).toBe('68cf62c4-5e08-5f6f-b5e1-fa476ca28d1f');
  });

  it('recognises a tenant\'s own role ids and nobody else\'s', () => {
    const ownerOfA = policy.systemRoleId(TENANT_A, 'owner');
    expect(policy.systemRoleName(TENANT_A, ownerOfA)).toBe('owner');
    expect(policy.systemRoleName(TENANT_B, ownerOfA)).toBeUndefined();
    expect(policy.systemRoleName(TENANT_A, '33333333-3333-4333-8333-333333333333')).toBeUndefined();
  });

  it('grants a role\'s permissions only in its own tenant', () => {
    const ownerOfA = policy.systemRoleId(TENANT_A, 'owner');
    expect(policy.permissionsForRoles(TENANT_A, [ownerOfA]).allows('user:manage')).toBe(true);
    expect(policy.permissionsForRoles(TENANT_B, [ownerOfA]).isEmpty()).toBe(true);
  });

  it('grants nothing for no roles or unknown roles', () => {
    expect(policy.permissionsForRoles(TENANT_A, []).isEmpty()).toBe(true);
    expect(
      policy.permissionsForRoles(TENANT_A, ['admin', 'owner', 'not-a-uuid']).isEmpty(),
    ).toBe(true);
  });

  it('unions the permissions of several roles', () => {
    const permissions = policy.permissionsForRoles(TENANT_A, [
      policy.systemRoleId(TENANT_A, 'viewer'),
      policy.systemRoleId(TENANT_A, 'member'),
    ]);
    expect(permissions.allows('knowledge:write')).toBe(true);
    expect(permissions.allows('knowledge:delete')).toBe(false);
  });

  it('lists the four system roles with their ids and permissions', () => {
    const roles = policy.listSystemRoles(TENANT_A);
    expect(roles.map((role) => role.name)).toEqual(['owner', 'admin', 'member', 'viewer']);
    expect(roles[0]?.id).toBe(policy.systemRoleId(TENANT_A, 'owner'));
    expect(roles[0]?.permissions).toContain('knowledge:*');
  });
});
