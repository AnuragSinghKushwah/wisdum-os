import type { PlatformCapability } from '@wisdum/contracts';

/**
 * Jobs capability: background processing, scheduling, and event delivery.
 * The `EventBus` transport from `@wisdum/events` will be implemented here
 * or by a broker plugin, under a future ADR.
 */
export const jobsCapability: PlatformCapability = {
  name: 'jobs',
  description: 'Background jobs, scheduling, and event delivery.',
};
