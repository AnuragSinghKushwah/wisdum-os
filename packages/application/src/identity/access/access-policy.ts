import { createHash } from 'node:crypto';
import {
  PermissionSet,
  SYSTEM_ROLE_NAMES,
  SYSTEM_ROLE_PERMISSIONS,
  isSystemRoleName,
} from '@wisdum/domain';
import type { SystemRoleName } from '@wisdum/domain';
import type { TenantId } from '@wisdum/types';

/** Fixed namespace for deriving system role ids; changing it would orphan every assignment. */
const SYSTEM_ROLE_NAMESPACE = '5f0d3a6e-8d3c-4f43-9c63-2a1f6e0b7d11';

/** RFC 4122 version 5: a UUID computed from a namespace and a name. */
function uuidV5(namespace: string, name: string): string {
  const digest = createHash('sha1')
    .update(Buffer.from(namespace.replaceAll('-', ''), 'hex'))
    .update(name, 'utf8')
    .digest();
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

export interface SystemRoleDescriptor {
  readonly id: string;
  readonly name: SystemRoleName;
  readonly permissions: readonly string[];
}

/**
 * Resolves what a user may do from the role ids they carry.
 *
 * Every tenant has the four system roles. Their ids are derived from the
 * tenant and the role name, so no role rows need to exist or be looked up:
 * given a tenant, a role id either matches one of its four derived ids or is
 * unknown. Their permissions live in code (`SYSTEM_ROLE_PERMISSIONS`), so a
 * release that adds a permission changes every tenant at once.
 *
 * Custom per-tenant roles are not supported yet; an id that is not a system
 * role grants nothing.
 */
export class AccessPolicy {
  systemRoleId(tenantId: TenantId, name: SystemRoleName): string {
    return uuidV5(SYSTEM_ROLE_NAMESPACE, `${tenantId}:${name}`);
  }

  /** The system role a role id denotes within `tenantId`, if any. */
  systemRoleName(tenantId: TenantId, roleId: string): SystemRoleName | undefined {
    return SYSTEM_ROLE_NAMES.find((name) => this.systemRoleId(tenantId, name) === roleId);
  }

  permissionsOfSystemRole(name: SystemRoleName): PermissionSet {
    return PermissionSet.of(SYSTEM_ROLE_PERMISSIONS[name]);
  }

  /** Union of the permissions of every recognised role; unrecognised ids contribute nothing. */
  permissionsForRoles(tenantId: TenantId, roleIds: readonly string[]): PermissionSet {
    const names = new Set<SystemRoleName>();
    for (const roleId of roleIds) {
      const name = this.systemRoleName(tenantId, roleId);
      if (name !== undefined) {
        names.add(name);
      }
    }
    return PermissionSet.union([...names].map((name) => this.permissionsOfSystemRole(name)));
  }

  listSystemRoles(tenantId: TenantId): readonly SystemRoleDescriptor[] {
    return SYSTEM_ROLE_NAMES.map((name) => ({
      id: this.systemRoleId(tenantId, name),
      name,
      permissions: SYSTEM_ROLE_PERMISSIONS[name],
    }));
  }

  isSystemRoleName(value: string): value is SystemRoleName {
    return isSystemRoleName(value);
  }
}
