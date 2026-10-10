import { describe, expect, it } from 'vitest';
import { catalogPermissions } from './permission-catalog.js';
import { PermissionSet } from './permission-set.js';
import { SYSTEM_ROLE_NAMES, SYSTEM_ROLE_PERMISSIONS, isSystemRoleName } from './system-roles.js';

const roleSet = (name: (typeof SYSTEM_ROLE_NAMES)[number]) =>
  PermissionSet.of(SYSTEM_ROLE_PERMISSIONS[name]);

describe('PermissionSet', () => {
  it('allows exactly what it holds', () => {
    const set = PermissionSet.of(['knowledge:read', 'document:write']);
    expect(set.allows('knowledge:read')).toBe(true);
    expect(set.allows('document:write')).toBe(true);
    expect(set.allows('knowledge:write')).toBe(false);
    expect(set.allows('document:read')).toBe(false);
  });

  it('honours a resource wildcard but not across resources', () => {
    const set = PermissionSet.of(['knowledge:*']);
    expect(set.allows('knowledge:delete')).toBe(true);
    expect(set.allows('document:read')).toBe(false);
  });

  it('is empty by default and allows nothing', () => {
    expect(PermissionSet.empty().isEmpty()).toBe(true);
    expect(PermissionSet.empty().allows('knowledge:read')).toBe(false);
  });

  it('rejects a malformed permission name', () => {
    expect(() => PermissionSet.of(['not a permission'])).toThrow();
    expect(() => PermissionSet.empty().allows('nope')).toThrow();
  });

  it('collapses duplicates and unions sets', () => {
    const merged = PermissionSet.union([
      PermissionSet.of(['knowledge:read', 'Knowledge:Read']),
      PermissionSet.of(['document:read']),
    ]);
    expect(merged.toArray().sort()).toEqual(['document:read', 'knowledge:read']);
  });

  describe('includesAll', () => {
    it('is true for a superset and for an equal set', () => {
      const big = PermissionSet.of(['knowledge:*', 'document:read']);
      expect(big.includesAll(PermissionSet.of(['knowledge:write', 'document:read']))).toBe(true);
      expect(big.includesAll(big)).toBe(true);
    });

    it('is false when anything is missing', () => {
      const held = PermissionSet.of(['knowledge:read']);
      expect(held.includesAll(PermissionSet.of(['knowledge:read', 'knowledge:write']))).toBe(false);
    });

    it('does not let a specific permission stand in for a wildcard', () => {
      const held = PermissionSet.of(['knowledge:read', 'knowledge:write', 'knowledge:delete']);
      expect(held.includesAll(PermissionSet.of(['knowledge:*']))).toBe(false);
    });

    it('treats the empty set as included by everything', () => {
      expect(PermissionSet.empty().includesAll(PermissionSet.empty())).toBe(true);
      expect(PermissionSet.of(['knowledge:read']).includesAll(PermissionSet.empty())).toBe(true);
    });
  });
});

describe('system roles', () => {
  it('defines a permission list for every system role, all of them valid names', () => {
    for (const name of SYSTEM_ROLE_NAMES) {
      expect(() => roleSet(name)).not.toThrow();
      expect(roleSet(name).isEmpty()).toBe(false);
    }
  });

  it('only references permissions that exist in the catalog', () => {
    const known = new Set<string>(catalogPermissions());
    for (const name of SYSTEM_ROLE_NAMES) {
      for (const permission of SYSTEM_ROLE_PERMISSIONS[name]) {
        if (permission.endsWith(':*')) continue;
        expect(known.has(permission), `${name} -> ${permission}`).toBe(true);
      }
    }
  });

  it('gives the owner every permission in the catalog', () => {
    const owner = roleSet('owner');
    for (const permission of catalogPermissions()) {
      expect(owner.allows(permission), permission).toBe(true);
    }
  });

  it('nests the roles: viewer within member within admin within owner', () => {
    expect(roleSet('member').includesAll(roleSet('viewer'))).toBe(true);
    expect(roleSet('admin').includesAll(roleSet('member'))).toBe(true);
    expect(roleSet('owner').includesAll(roleSet('admin'))).toBe(true);
    expect(roleSet('viewer').includesAll(roleSet('member'))).toBe(false);
    expect(roleSet('admin').includesAll(roleSet('owner'))).toBe(false);
  });

  it('keeps admin from changing the organization, so it cannot grant owner', () => {
    const admin = roleSet('admin');
    expect(admin.allows('organization:write')).toBe(false);
    expect(admin.allows('organization:read')).toBe(true);
    expect(admin.allows('user:manage')).toBe(true);
    expect(admin.allows('api-key:manage')).toBe(true);
    expect(admin.includesAll(roleSet('owner'))).toBe(false);
  });

  it('limits a viewer to reading', () => {
    for (const permission of SYSTEM_ROLE_PERMISSIONS.viewer) {
      expect(permission.endsWith(':read'), permission).toBe(true);
    }
    const viewer = roleSet('viewer');
    expect(viewer.allows('user:read')).toBe(false);
    expect(viewer.allows('api-key:manage')).toBe(false);
  });

  it('keeps administration and publishing away from a member', () => {
    const member = roleSet('member');
    for (const denied of [
      'knowledge:publish',
      'knowledge:delete',
      'draft:publish',
      'user:manage',
      'api-key:manage',
      'workspace:manage',
      'plugin:manage',
      'search-index:manage',
      'capture:ingest',
      'organization:write',
    ]) {
      expect(member.allows(denied), denied).toBe(false);
    }
    expect(member.allows('knowledge:write')).toBe(true);
  });

  it('recognises system role names', () => {
    expect(isSystemRoleName('owner')).toBe(true);
    expect(isSystemRoleName('superuser')).toBe(false);
  });
});
