/**
 * Generic object storage primitive. Specialized storage concerns (blob
 * versioning, artifact stores, attachments — Phase 16) build on top of
 * this; the infrastructure layer only needs a minimal put/get/delete/list
 * capability behind a vendor-neutral interface.
 */
export interface StorageProvider {
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | undefined>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<readonly string[]>;
}
