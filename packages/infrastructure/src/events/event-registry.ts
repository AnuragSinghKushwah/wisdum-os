import { ConfigurationError } from '@wisdum/errors';
import type { EventContract, EventName } from '@wisdum/contracts';
import type { Event } from '@wisdum/events';

/**
 * Catalog of known event contracts (name + current schema version).
 * Publishers and subscribers consult it to confirm they agree on a
 * version before wiring together — catches drift between a producer and
 * a consumer written against an older payload shape.
 */
export class EventRegistry {
  private readonly contracts = new Map<EventName, EventContract>();

  register(contract: EventContract): void {
    const existing = this.contracts.get(contract.name);
    if (existing !== undefined && existing.version !== contract.version) {
      throw new ConfigurationError(
        `Event '${contract.name}' is already registered at version ${existing.version}`,
        { name: contract.name, registeredVersion: existing.version, requested: contract.version },
      );
    }
    this.contracts.set(contract.name, contract);
  }

  get(name: EventName): EventContract | undefined {
    return this.contracts.get(name);
  }

  names(): readonly EventName[] {
    return [...this.contracts.keys()];
  }

  /** Confirms an event's version matches its registered contract, if any is registered. */
  assertKnownVersion(event: Event): void {
    const contract = this.contracts.get(event.name);
    if (contract !== undefined && contract.version !== event.version) {
      throw new ConfigurationError(
        `Event '${event.name}' version mismatch: registry expects ${contract.version}, got ${event.version}`,
        { name: event.name, expected: contract.version, actual: event.version },
      );
    }
  }
}
