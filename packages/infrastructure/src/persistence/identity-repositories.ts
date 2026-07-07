import type {
  ApiKey,
  ApiKeyId,
  ApiKeyRepository,
  Email,
  PasswordHash,
  Permission,
  PermissionId,
  PermissionName,
  PermissionRepository,
  Role,
  RoleId,
  RoleName,
  RoleRepository,
  ServiceAccount,
  ServiceAccountId,
  ServiceAccountRepository,
  User,
  UserId,
  UserRepository,
} from '@wisdum/domain';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryUserRepository
  extends InMemoryRepository<UserId, User>
  implements UserRepository
{
  findByEmail(tenantId: TenantId, email: Email): Promise<Option<User>> {
    const found = this.values().find(
      (user) => user.tenantId === tenantId && user.email.equals(email),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }
}

export class InMemoryRoleRepository
  extends InMemoryRepository<RoleId, Role>
  implements RoleRepository
{
  findByName(tenantId: TenantId, name: RoleName): Promise<Option<Role>> {
    const found = this.values().find(
      (role) => role.tenantId === tenantId && role.name.equals(name),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findAll(tenantId: TenantId): Promise<readonly Role[]> {
    return Promise.resolve(this.values().filter((role) => role.tenantId === tenantId));
  }
}

export class InMemoryPermissionRepository
  extends InMemoryRepository<PermissionId, Permission>
  implements PermissionRepository
{
  findByName(tenantId: TenantId, name: PermissionName): Promise<Option<Permission>> {
    const found = this.values().find(
      (permission) => permission.tenantId === tenantId && permission.name.equals(name),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findAll(tenantId: TenantId): Promise<readonly Permission[]> {
    return Promise.resolve(this.values().filter((permission) => permission.tenantId === tenantId));
  }
}

export class InMemoryApiKeyRepository
  extends InMemoryRepository<ApiKeyId, ApiKey>
  implements ApiKeyRepository
{
  findByKeyHash(keyHash: PasswordHash): Promise<Option<ApiKey>> {
    const found = this.values().find((apiKey) => apiKey.keyHash.equals(keyHash));
    return Promise.resolve(found === undefined ? none : some(found));
  }
}

export class InMemoryServiceAccountRepository
  extends InMemoryRepository<ServiceAccountId, ServiceAccount>
  implements ServiceAccountRepository
{
  findAll(tenantId: TenantId): Promise<readonly ServiceAccount[]> {
    return Promise.resolve(this.values().filter((account) => account.tenantId === tenantId));
  }
}
