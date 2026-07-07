export interface ObjectVersion {
  readonly versionId: string;
  readonly key: string;
  readonly sizeBytes: number;
  readonly etag: string;
  readonly createdAt: string;
}

/**
 * Tracks every revision written under a key, newest first. Deleting a
 * version never affects the others — the store is append-only until a
 * caller explicitly prunes a specific version.
 */
export interface VersionStore {
  putVersion(key: string, data: Buffer, contentType: string): Promise<ObjectVersion>;
  getVersion(key: string, versionId: string): Promise<Buffer | undefined>;
  /** Newest first. */
  listVersions(key: string): Promise<readonly ObjectVersion[]>;
  latestVersion(key: string): Promise<ObjectVersion | undefined>;
  deleteVersion(key: string, versionId: string): Promise<void>;
}
