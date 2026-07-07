import type { IsoTimestamp } from '@wisdum/types';

/**
 * Abstraction for obtaining the current time. Domain logic must never call
 * Date directly; instead, it requests the time from a Clock implementation.
 * This enables testing with frozen or mocked time.
 */
export interface Clock {
  /** Return the current time as an ISO-8601 string in UTC. */
  now(): IsoTimestamp;
}

/**
 * System clock — returns the actual current time.
 */
export class SystemClock implements Clock {
  now(): IsoTimestamp {
    return new Date().toISOString() as IsoTimestamp;
  }

  static instance(): SystemClock {
    return new SystemClock();
  }
}
