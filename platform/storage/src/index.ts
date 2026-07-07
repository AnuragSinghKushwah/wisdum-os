import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Storage capability: object and file storage behind an S3-compatible
 * provider abstraction (cloud providers and self-hosted MinIO alike).
 */
export const storageCapability: PlatformCapability = {
  name: 'storage',
  description: 'Object and file storage behind an S3-compatible provider abstraction.',
};

export * from './blob/index.js';
export * from './object/index.js';
export * from './version/index.js';
export * from './artifact/index.js';
export * from './attachment/index.js';
