import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FilesystemBlobStorage } from './filesystem-blob-storage.js';

describe('FilesystemBlobStorage', () => {
  let rootDir: string;
  let storage: FilesystemBlobStorage;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'wisdum-blob-'));
    storage = new FilesystemBlobStorage(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('put() then get() round-trips the exact bytes', async () => {
    await storage.put('docs/hello.txt', Buffer.from('hello world'));
    await expect(storage.get('docs/hello.txt')).resolves.toEqual(Buffer.from('hello world'));
  });

  it('get() returns undefined for a missing key', async () => {
    await expect(storage.get('does/not/exist')).resolves.toBeUndefined();
  });

  it('creates intermediate directories implied by the key', async () => {
    await storage.put('a/b/c/file.bin', Buffer.from([1, 2, 3]));
    await expect(storage.get('a/b/c/file.bin')).resolves.toEqual(Buffer.from([1, 2, 3]));
  });

  it('delete() removes the key and is a no-op if it never existed', async () => {
    await storage.put('to-delete.txt', Buffer.from('bye'));
    await storage.delete('to-delete.txt');
    await expect(storage.get('to-delete.txt')).resolves.toBeUndefined();
    await expect(storage.delete('never-existed.txt')).resolves.toBeUndefined();
  });

  it('list(prefix) returns only keys under that prefix', async () => {
    await storage.put('knowledge/1/content', Buffer.from('a'));
    await storage.put('knowledge/2/content', Buffer.from('b'));
    await storage.put('documents/1/content', Buffer.from('c'));

    const keys = await storage.list('knowledge/');

    expect([...keys].sort()).toEqual(['knowledge/1/content', 'knowledge/2/content']);
  });

  it('rejects a key that resolves outside the storage root', async () => {
    await expect(storage.put('../escape.txt', Buffer.from('x'))).rejects.toThrow(
      /outside the storage root/,
    );
  });
});
