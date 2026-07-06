import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Plugin runtime capability: registration, lifecycle, and contract enforcement
 * for the provider implementations hosted in the top-level `plugins/` directory.
 */
export const pluginsCapability: PlatformCapability = {
  name: 'plugins',
  description: 'Registration and lifecycle for external provider plugins.',
};
