import type { TenantId } from '@wisdum/types';
import type { UserDto } from '../dto/user-dto.js';

export interface UserReadModel {
  findById(userId: string): Promise<UserDto | undefined>;
  listByTenant(tenantId: TenantId): Promise<readonly UserDto[]>;
}
