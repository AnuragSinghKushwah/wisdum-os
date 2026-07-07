import type { User } from '@wisdum/domain';

export interface UserDto {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly status: string;
  readonly roleIds: readonly string[];
  readonly createdAt: string;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.getId().value(),
    email: user.email.value,
    displayName: user.displayName.value,
    status: user.status.value,
    roleIds: user.roleIds.map((roleId) => roleId.value()),
    createdAt: user.createdAt,
  };
}
