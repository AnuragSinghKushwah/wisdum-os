/**
 * Literal vocabularies of the Identity bounded context. Value objects wrap
 * and validate these; the raw values appear in event payloads.
 */

export const USER_STATUSES = ['active', 'suspended', 'deleted'] as const;
export type UserStatusValue = (typeof USER_STATUSES)[number];

export const API_KEY_STATUSES = ['active', 'revoked'] as const;
export type ApiKeyStatusValue = (typeof API_KEY_STATUSES)[number];

export const SERVICE_ACCOUNT_STATUSES = ['enabled', 'disabled'] as const;
export type ServiceAccountStatusValue = (typeof SERVICE_ACCOUNT_STATUSES)[number];

/** Who an API key acts on behalf of. */
export const API_KEY_OWNER_TYPES = ['user', 'service-account'] as const;
export type ApiKeyOwnerType = (typeof API_KEY_OWNER_TYPES)[number];
