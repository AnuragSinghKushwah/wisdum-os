import type { PlatformCapability } from '@wisdum/contracts';

/**
 * AI subsystem capability: reusable model-backed services behind provider
 * abstractions. Model providers integrate as plugins, never directly.
 */
export const aiCapability: PlatformCapability = {
  name: 'ai',
  description: 'Reusable AI services behind provider abstractions.',
};

export * from './providers/index.js';
export * from './memory/index.js';
export * from './context/index.js';
export * from './runtime/index.js';
