import type { DomainDescriptor } from '../shared/index.js';

/** Plugin bounded context — placeholder until its ADR and design doc land. */
export const pluginDomain: DomainDescriptor = {
  name: 'plugin',
  description: 'Registered plugins and their lifecycle state within a tenant.',
};
