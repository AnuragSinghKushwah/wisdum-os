import type { Clock } from '@wisdum/domain';
import type { IsoTimestamp } from '@wisdum/types';

/** A clock fixed to a single instant, or manually advanced. For tests and seed scripts. */
export class FrozenClock implements Clock {
  constructor(private current: IsoTimestamp) {}

  now(): IsoTimestamp {
    return this.current;
  }

  advanceTo(next: IsoTimestamp): void {
    this.current = next;
  }
}
