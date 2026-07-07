import { UserId } from '@wisdum/domain';
import type { UserDto, UserReadModel } from '@wisdum/application';
import { toUserDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { InMemoryUserRepository } from '../persistence/identity-repositories.js';

export class InMemoryUserReadModel implements UserReadModel {
  constructor(private readonly repository: InMemoryUserRepository) {}

  async findById(userId: string): Promise<UserDto | undefined> {
    const found = await this.repository.findById(UserId.create(userId));
    return found.some ? toUserDto(found.value) : undefined;
  }

  listByTenant(tenantId: TenantId): Promise<readonly UserDto[]> {
    const dtos = this.repository
      .all()
      .filter((user) => user.tenantId === tenantId)
      .map(toUserDto);
    return Promise.resolve(dtos);
  }
}
