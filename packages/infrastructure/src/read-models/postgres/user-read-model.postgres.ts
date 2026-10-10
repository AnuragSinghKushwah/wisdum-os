import { UserId } from '@wisdum/domain';
import type { UserDto, UserReadModel } from '@wisdum/application';
import { toUserDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { PostgresUserRepository } from '../../persistence/postgres/user-repository.postgres.js';

export class PostgresUserReadModel implements UserReadModel {
  constructor(private readonly repository: PostgresUserRepository) {}

  async findById(tenantId: TenantId, userId: string): Promise<UserDto | undefined> {
    const found = await this.repository.findById(UserId.create(userId));
    return found.some && found.value.tenantId === tenantId ? toUserDto(found.value) : undefined;
  }

  async listByTenant(tenantId: TenantId): Promise<readonly UserDto[]> {
    const users = await this.repository.listByTenant(tenantId);
    return users.map(toUserDto);
  }
}
