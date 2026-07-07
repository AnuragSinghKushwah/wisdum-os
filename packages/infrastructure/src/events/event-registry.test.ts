import { describe, expect, it } from 'vitest';
import type { Event } from '@wisdum/events';
import { EventRegistry } from './event-registry.js';

describe('EventRegistry', () => {
  it('registers and retrieves a contract by name', () => {
    const registry = new EventRegistry();
    registry.register({ name: 'knowledge.asset.created', version: 1 });

    expect(registry.get('knowledge.asset.created')).toEqual({
      name: 'knowledge.asset.created',
      version: 1,
    });
  });

  it('re-registering the same name at the same version is a no-op', () => {
    const registry = new EventRegistry();
    registry.register({ name: 'knowledge.asset.created', version: 1 });
    expect(() => registry.register({ name: 'knowledge.asset.created', version: 1 })).not.toThrow();
  });

  it('registering the same name at a different version throws', () => {
    const registry = new EventRegistry();
    registry.register({ name: 'knowledge.asset.created', version: 1 });
    expect(() => registry.register({ name: 'knowledge.asset.created', version: 2 })).toThrow(
      /already registered/i,
    );
  });

  it('assertKnownVersion() is a no-op for an unregistered event name', () => {
    const registry = new EventRegistry();
    const event: Event = {
      id: 'evt-1' as never,
      name: 'unregistered.thing.happened',
      version: 5,
      tenantId: 'tenant-1' as never,
      occurredAt: '2024-01-01T00:00:00.000Z' as never,
      payload: {},
    };
    expect(() => registry.assertKnownVersion(event)).not.toThrow();
  });

  it('assertKnownVersion() throws when an event carries an unexpected version', () => {
    const registry = new EventRegistry();
    registry.register({ name: 'knowledge.asset.created', version: 1 });
    const event: Event = {
      id: 'evt-1' as never,
      name: 'knowledge.asset.created',
      version: 2,
      tenantId: 'tenant-1' as never,
      occurredAt: '2024-01-01T00:00:00.000Z' as never,
      payload: {},
    };
    expect(() => registry.assertKnownVersion(event)).toThrow(/version mismatch/i);
  });
});
