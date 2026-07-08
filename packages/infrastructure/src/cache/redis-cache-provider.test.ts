import { describe, expect, it } from 'vitest';
import { RedisCacheProvider } from './redis-cache-provider.js';
import type { RedisKeyValueClient } from './redis-cache-provider.js';

function createFakeClient(): RedisKeyValueClient {
  const store = new Map<string, string>();
  return {
    get: (key) => Promise.resolve(store.get(key) ?? null),
    set: (key, value) => {
      store.set(key, value);
      return Promise.resolve();
    },
    setex: (key, _seconds, value) => {
      store.set(key, value);
      return Promise.resolve();
    },
    del: (key) => {
      store.delete(key);
      return Promise.resolve();
    },
  };
}

describe('RedisCacheProvider', () => {
  it('round-trips a JSON-serializable value', async () => {
    const provider = new RedisCacheProvider(createFakeClient());
    await provider.set('key-1', { a: 1, b: 'two' });
    await expect(provider.get('key-1')).resolves.toEqual({ a: 1, b: 'two' });
  });

  it('returns undefined for a missing key', async () => {
    const provider = new RedisCacheProvider(createFakeClient());
    await expect(provider.get('missing')).resolves.toBeUndefined();
  });

  it('uses setex when a TTL is given', async () => {
    const client = createFakeClient();
    let setexCalled = false;
    client.setex = (key, seconds, value) => {
      setexCalled = true;
      expect(seconds).toBe(30);
      return createFakeClient().setex(key, seconds, value);
    };
    const provider = new RedisCacheProvider(client);

    await provider.set('key-1', { a: 1 }, 30);

    expect(setexCalled).toBe(true);
  });

  it('delete() removes the key', async () => {
    const provider = new RedisCacheProvider(createFakeClient());
    await provider.set('key-1', 'value');
    await provider.delete('key-1');
    await expect(provider.get('key-1')).resolves.toBeUndefined();
  });
});
