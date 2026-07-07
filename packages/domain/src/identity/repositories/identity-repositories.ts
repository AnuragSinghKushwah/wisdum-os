import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { ApiKey } from '../entities/api-key.js';
import type { Permission } from '../entities/permission.js';
import type { Role } from '../entities/role.js';
import type { ServiceAccount } from '../entities/service-account.js';
import type { User } from '../entities/user.js';
import type { Email } from '../value-objects/email.js';
import type {
  ApiKeyId,
  PermissionId,
  RoleId,
  ServiceAccountId,
  UserId,
} from '../value-objects/identity-ids.js';
import type { PasswordHash } from '../value-objects/password-hash.js';
import type { PermissionName } from '../value-objects/permission-name.js';
import type { RoleName } from '../value-objects/role-name.js';

/**
 * Persistence ports of the Identity bounded context. Interfaces only —
 * implementations live outside the domain (ADR 0007).
 */

export interface UserRepository extends Repository<User> {
  findById(id: UserId): Promise<Option<User>>;
  /** Email is the tenant-scoped natural key used at sign-in. */
  findByEmail(tenantId: TenantId, email: Email): Promise<Option<User>>;
  exists(id: UserId): Promise<boolean>;
  save(user: User): Promise<void>;
  delete(user: User): Promise<void>;
}

export interface RoleRepository extends Repository<Role> {
  findById(id: RoleId): Promise<Option<Role>>;
  findByName(tenantId: TenantId, name: RoleName): Promise<Option<Role>>;
  findAll(tenantId: TenantId): Promise<readonly Role[]>;
  save(role: Role): Promise<void>;
  delete(role: Role): Promise<void>;
}

export interface PermissionRepository extends Repository<Permission> {
  findById(id: PermissionId): Promise<Option<Permission>>;
  findByName(tenantId: TenantId, name: PermissionName): Promise<Option<Permission>>;
  findAll(tenantId: TenantId): Promise<readonly Permission[]>;
  save(permission: Permission): Promise<void>;
  delete(permission: Permission): Promise<void>;
}

export interface ApiKeyRepository extends Repository<ApiKey> {
  findById(id: ApiKeyId): Promise<Option<ApiKey>>;
  /** Authentication path: resolve a presented (already hashed) key. */
  findByKeyHash(keyHash: PasswordHash): Promise<Option<ApiKey>>;
  save(apiKey: ApiKey): Promise<void>;
  delete(apiKey: ApiKey): Promise<void>;
}

export interface ServiceAccountRepository extends Repository<ServiceAccount> {
  findById(id: ServiceAccountId): Promise<Option<ServiceAccount>>;
  findAll(tenantId: TenantId): Promise<readonly ServiceAccount[]>;
  save(account: ServiceAccount): Promise<void>;
  delete(account: ServiceAccount): Promise<void>;
}
