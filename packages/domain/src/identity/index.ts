import type { DomainDescriptor } from '../shared/index.js';

/** Identity bounded context — placeholder until its ADR and design doc land. */
export const identityDomain: DomainDescriptor = {
  name: 'identity',
  description: 'Actors on the platform and their tenant memberships.',
};
