/**
 * Raw binary storage keyed by opaque string keys. The lowest-level
 * storage primitive; richer stores (object metadata, versioning,
 * artifacts, attachments) all compose on top of this shape.
 */
export interface BlobStorage {
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | undefined>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<readonly string[]>;
}
