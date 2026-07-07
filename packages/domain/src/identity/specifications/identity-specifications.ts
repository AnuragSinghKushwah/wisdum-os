import type { IsoTimestamp } from '@wisdum/types';
import { ComposableSpecification } from '../../shared/index.js';
import type { ApiKey } from '../entities/api-key.js';
import type { Role } from '../entities/role.js';
import type { User } from '../entities/user.js';
import type { RoleId } from '../value-objects/identity-ids.js';
import type { PermissionName } from '../value-objects/permission-name.js';

/** Satisfied when the user can sign in and act on the platform. */
export class UserIsActive extends ComposableSpecification<User> {
  override isSatisfiedBy(candidate: User): boolean {
    return candidate.status.is('active');
  }
}

/** Satisfied when the user holds the given role. */
export class UserHasRole extends ComposableSpecification<User> {
  constructor(private readonly roleId: RoleId) {
    super();
  }

  override isSatisfiedBy(candidate: User): boolean {
    return candidate.hasRole(this.roleId);
  }
}

/** Satisfied when the user has local credentials (not SSO-only). */
export class UserHasLocalCredentials extends ComposableSpecification<User> {
  override isSatisfiedBy(candidate: User): boolean {
    return candidate.passwordHash !== undefined;
  }
}

/** Satisfied when the role's permissions (including wildcards) cover the requested one. */
export class RoleAllowsPermission extends ComposableSpecification<Role> {
  constructor(private readonly requested: PermissionName) {
    super();
  }

  override isSatisfiedBy(candidate: Role): boolean {
    return candidate.allows(this.requested);
  }
}

/** Satisfied when the API key can authenticate at the given moment. */
export class ApiKeyIsUsable extends ComposableSpecification<ApiKey> {
  constructor(private readonly now: IsoTimestamp) {
    super();
  }

  override isSatisfiedBy(candidate: ApiKey): boolean {
    return candidate.isUsableAt(this.now);
  }
}
