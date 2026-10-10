import type { DomainDescriptor } from '../shared/index.js';

/** Identity bounded context — actors on the platform and what they may do. */
export const identityDomain: DomainDescriptor = {
  name: 'identity',
  description: 'Users, roles, permissions, API keys, and service accounts.',
};

export * from './types/identity-types.js';
export * from './value-objects/identity-ids.js';
export * from './value-objects/email.js';
export * from './value-objects/display-name.js';
export * from './value-objects/password-hash.js';
export * from './value-objects/role-name.js';
export * from './value-objects/permission-name.js';
export * from './value-objects/user-status.js';
export * from './events/identity-events.js';
export * from './entities/user.js';
export * from './entities/role.js';
export * from './entities/permission.js';
export * from './entities/api-key.js';
export * from './entities/service-account.js';
export * from './repositories/identity-repositories.js';
export * from './specifications/identity-specifications.js';
export * from './access/permission-catalog.js';
export * from './access/permission-set.js';
export * from './access/system-roles.js';
