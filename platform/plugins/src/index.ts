import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Plugin runtime capability: registration, lifecycle, and contract enforcement
 * for the provider implementations hosted in the top-level `plugins/` directory.
 */
export const pluginsCapability: PlatformCapability = {
  name: 'plugins',
  description: 'Registration and lifecycle for external provider plugins.',
};

export * from './sandbox/index.js';
export * from './discovery/index.js';
export * from './loader/index.js';
export * from './registry/index.js';
export * from './capability/index.js';
export * from './dependency/index.js';
export * from './lifecycle/index.js';
