import type { TenantId } from '@wisdum/types';
import type { UserDto } from '../dto/user-dto.js';

export interface UserReadModel {
  /** Resolves to `undefined` for a user that does not exist *in this tenant*. */
  findById(tenantId: TenantId, userId: string): Promise<UserDto | undefined>;
  listByTenant(tenantId: TenantId): Promise<readonly UserDto[]>;
}
