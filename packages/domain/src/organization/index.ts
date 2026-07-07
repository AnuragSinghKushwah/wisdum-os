import type { DomainDescriptor } from '../shared/index.js';

/** Organization bounded context — the tenant-level umbrella over workspaces. */
export const organizationDomain: DomainDescriptor = {
  name: 'organization',
  description: 'Organizations, their workspaces, subscription, branding, and policies.',
};

export * from './types/organization-types.js';
export * from './value-objects/organization-id.js';
export * from './value-objects/organization-name.js';
export * from './value-objects/organization-slug.js';
export * from './value-objects/organization-status.js';
export * from './value-objects/subscription-reference.js';
export * from './value-objects/branding.js';
export * from './value-objects/organization-policies.js';
export * from './events/organization-events.js';
export * from './entities/organization.js';
export * from './repositories/organization-repository.js';
export * from './specifications/organization-specifications.js';
