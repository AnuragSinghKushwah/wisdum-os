import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { ValidationError } from '@wisdum/errors';
import type { BlobStorage } from './blob-storage.js';

/**
 * Filesystem-backed `BlobStorage` for self-hosted deployments without an
 * S3-compatible object store. Keys map to paths under `rootDir`; every
 * resolved path is verified to stay within `rootDir` before any file
 * operation, since keys may ultimately be derived from user input.
 */
export class FilesystemBlobStorage implements BlobStorage {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = resolve(rootDir);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.resolveKeyPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string): Promise<Buffer | undefined> {
    const path = this.resolveKeyPath(key);
    try {
      return await readFile(path);
    } catch (error) {
      if (isNotFoundError(error)) return undefined;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.resolveKeyPath(key);
    await rm(path, { force: true });
  }

  async list(prefix: string): Promise<readonly string[]> {
    const keys = await this.walk(this.rootDir);
    return keys.filter((key) => key.startsWith(prefix));
  }

  private async walk(dir: string): Promise<readonly string[]> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (isNotFoundError(error)) return [];
      throw error;
    }

    const keys: string[] = [];
    for (const entry of entries) {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        keys.push(...(await this.walk(entryPath)));
      } else {
        keys.push(relative(this.rootDir, entryPath).split(sep).join('/'));
      }
    }
    return keys;
  }

  private resolveKeyPath(key: string): string {
    const path = resolve(this.rootDir, key);
    if (path !== this.rootDir && !path.startsWith(this.rootDir + sep)) {
      throw new ValidationError(`Blob key resolves outside the storage root: '${key}'`, { key });
    }
    return path;
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
