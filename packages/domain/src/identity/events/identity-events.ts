import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type { ApiKeyOwnerType, UserStatusValue } from '../types/identity-types.js';

/**
 * Domain events of the Identity bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const IDENTITY_EVENT_SCHEMA_VERSION = 1;

export const USER_CREATED = 'identity.user.created';
export const USER_DELETED = 'identity.user.deleted';
export const USER_SUSPENDED = 'identity.user.suspended';
export const USER_REACTIVATED = 'identity.user.reactivated';
export const ROLE_ASSIGNED = 'identity.user.role-assigned';
export const ROLE_REVOKED = 'identity.user.role-revoked';
export const PERMISSION_GRANTED = 'identity.role.permission-granted';
export const PERMISSION_REVOKED = 'identity.role.permission-revoked';
export const API_KEY_CREATED = 'identity.api-key.created';
export const API_KEY_REVOKED = 'identity.api-key.revoked';
export const SERVICE_ACCOUNT_CREATED = 'identity.service-account.created';
export const SERVICE_ACCOUNT_DISABLED = 'identity.service-account.disabled';
export const SERVICE_ACCOUNT_ENABLED = 'identity.service-account.enabled';

type IdentityEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface UserCreatedPayload {
  readonly userId: UUID;
  readonly email: string;
  readonly displayName: string;
}
export type UserCreated = IdentityEvent<typeof USER_CREATED, UserCreatedPayload>;

export interface UserDeletedPayload {
  readonly userId: UUID;
  readonly previousStatus: UserStatusValue;
}
export type UserDeleted = IdentityEvent<typeof USER_DELETED, UserDeletedPayload>;

export interface UserSuspendedPayload {
  readonly userId: UUID;
  readonly reason: string;
}
export type UserSuspended = IdentityEvent<typeof USER_SUSPENDED, UserSuspendedPayload>;

export interface UserReactivatedPayload {
  readonly userId: UUID;
}
export type UserReactivated = IdentityEvent<typeof USER_REACTIVATED, UserReactivatedPayload>;

export interface RoleAssignedPayload {
  readonly userId: UUID;
  readonly roleId: UUID;
}
export type RoleAssigned = IdentityEvent<typeof ROLE_ASSIGNED, RoleAssignedPayload>;

export interface RoleRevokedPayload {
  readonly userId: UUID;
  readonly roleId: UUID;
}
export type RoleRevoked = IdentityEvent<typeof ROLE_REVOKED, RoleRevokedPayload>;

export interface PermissionGrantedPayload {
  readonly roleId: UUID;
  readonly permission: string;
}
export type PermissionGranted = IdentityEvent<typeof PERMISSION_GRANTED, PermissionGrantedPayload>;

export interface PermissionRevokedPayload {
  readonly roleId: UUID;
  readonly permission: string;
}
export type PermissionRevoked = IdentityEvent<typeof PERMISSION_REVOKED, PermissionRevokedPayload>;

export interface ApiKeyCreatedPayload {
  readonly apiKeyId: UUID;
  readonly ownerId: UUID;
  readonly ownerType: ApiKeyOwnerType;
  readonly label: string;
  readonly expiresAt: string | null;
}
export type ApiKeyCreated = IdentityEvent<typeof API_KEY_CREATED, ApiKeyCreatedPayload>;

export interface ApiKeyRevokedPayload {
  readonly apiKeyId: UUID;
  readonly ownerId: UUID;
}
export type ApiKeyRevoked = IdentityEvent<typeof API_KEY_REVOKED, ApiKeyRevokedPayload>;

export interface ServiceAccountCreatedPayload {
  readonly serviceAccountId: UUID;
  readonly displayName: string;
}
export type ServiceAccountCreated = IdentityEvent<
  typeof SERVICE_ACCOUNT_CREATED,
  ServiceAccountCreatedPayload
>;

export interface ServiceAccountDisabledPayload {
  readonly serviceAccountId: UUID;
}
export type ServiceAccountDisabled = IdentityEvent<
  typeof SERVICE_ACCOUNT_DISABLED,
  ServiceAccountDisabledPayload
>;

export interface ServiceAccountEnabledPayload {
  readonly serviceAccountId: UUID;
}
export type ServiceAccountEnabled = IdentityEvent<
  typeof SERVICE_ACCOUNT_ENABLED,
  ServiceAccountEnabledPayload
>;

export type AnyIdentityEvent =
  | UserCreated
  | UserDeleted
  | UserSuspended
  | UserReactivated
  | RoleAssigned
  | RoleRevoked
  | PermissionGranted
  | PermissionRevoked
  | ApiKeyCreated
  | ApiKeyRevoked
  | ServiceAccountCreated
  | ServiceAccountDisabled
  | ServiceAccountEnabled;
