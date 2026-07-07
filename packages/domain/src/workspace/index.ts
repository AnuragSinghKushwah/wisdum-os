import type { DomainDescriptor } from '../shared/index.js';

/** Workspace bounded context — the collaboration container for knowledge work. */
export const workspaceDomain: DomainDescriptor = {
  name: 'workspace',
  description: 'Workspaces, their members, settings, limits, and feature flags.',
};

export * from './types/workspace-types.js';
export * from './value-objects/workspace-id.js';
export * from './value-objects/workspace-name.js';
export * from './value-objects/workspace-slug.js';
export * from './value-objects/workspace-status.js';
export * from './value-objects/workspace-member.js';
export * from './value-objects/workspace-settings.js';
export * from './value-objects/workspace-limits.js';
export * from './value-objects/feature-flags.js';
export * from './events/workspace-events.js';
export * from './entities/workspace.js';
export * from './repositories/workspace-repository.js';
export * from './specifications/workspace-specifications.js';
