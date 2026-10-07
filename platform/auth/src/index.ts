import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Authentication and authorization capability. Concrete identity providers
 * integrate as plugins behind contracts defined here as the capability is built.
 */
export const authCapability: PlatformCapability = {
  name: 'auth',
  description: 'Authentication and authorization for platform actors.',
};

export * from './password-hasher.js';
