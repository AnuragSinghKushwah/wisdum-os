import type { DomainDescriptor } from '../shared/index.js';

/** Plugin bounded context — installed plugins and their lifecycle within a tenant. */
export const pluginDomain: DomainDescriptor = {
  name: 'plugin',
  description: 'Plugin installations: manifests, capabilities, permissions, lifecycle.',
};

export * from './types/plugin-types.js';
export * from './value-objects/plugin-id.js';
export * from './value-objects/plugin-name.js';
export * from './value-objects/plugin-version.js';
export * from './value-objects/plugin-capability.js';
export * from './value-objects/plugin-permission.js';
export * from './value-objects/plugin-dependency.js';
export * from './value-objects/plugin-manifest.js';
export * from './value-objects/plugin-status.js';
export * from './events/plugin-events.js';
export * from './entities/plugin.js';
export * from './repositories/plugin-repository.js';
export * from './specifications/plugin-specifications.js';
