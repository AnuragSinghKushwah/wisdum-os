import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Storage capability: object and file storage behind an S3-compatible
 * provider abstraction (cloud providers and self-hosted MinIO alike).
 */
export const storageCapability: PlatformCapability = {
  name: 'storage',
  description: 'Object and file storage behind an S3-compatible provider abstraction.',
};
