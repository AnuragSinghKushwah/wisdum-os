import { createHash, randomUUID } from 'node:crypto';
import type { BlobStorage } from '../blob/blob-storage.js';
import type { ObjectVersion, VersionStore } from './version-store.js';

/** Reference `VersionStore`: every write gets a new versioned blob key underneath. */
export class DefaultVersionStore implements VersionStore {
  private readonly versionsByKey = new Map<string, ObjectVersion[]>();

  constructor(private readonly blobs: BlobStorage) {}

  async putVersion(key: string, data: Buffer, contentType: string): Promise<ObjectVersion> {
    const version: ObjectVersion = {
      versionId: randomUUID(),
      key,
      sizeBytes: data.byteLength,
      etag: createHash('sha256').update(data).digest('hex'),
      createdAt: new Date().toISOString(),
    };
    await this.blobs.put(this.versionKey(key, version.versionId), data, contentType);
    const versions = this.versionsByKey.get(key) ?? [];
    versions.unshift(version);
    this.versionsByKey.set(key, versions);
    return version;
  }

  getVersion(key: string, versionId: string): Promise<Buffer | undefined> {
    return this.blobs.get(this.versionKey(key, versionId));
  }

  listVersions(key: string): Promise<readonly ObjectVersion[]> {
    return Promise.resolve(this.versionsByKey.get(key) ?? []);
  }

  latestVersion(key: string): Promise<ObjectVersion | undefined> {
    return Promise.resolve(this.versionsByKey.get(key)?.[0]);
  }

  async deleteVersion(key: string, versionId: string): Promise<void> {
    await this.blobs.delete(this.versionKey(key, versionId));
    const versions = this.versionsByKey.get(key);
    if (versions === undefined) return;
    this.versionsByKey.set(
      key,
      versions.filter((version) => version.versionId !== versionId),
    );
  }

  private versionKey(key: string, versionId: string): string {
    return `${key}@${versionId}`;
  }
}
