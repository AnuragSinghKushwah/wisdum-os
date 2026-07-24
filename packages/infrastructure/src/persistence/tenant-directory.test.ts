import { describe, expect, it } from 'vitest';
import { InMemoryTenantDirectory } from './tenant-directory.js';

describe('InMemoryTenantDirectory', () => {
  it('resolves an empty list', async () => {
    const directory = new InMemoryTenantDirectory();
    expect(await directory.listAllTenantIds()).toEqual([]);
  });
});
