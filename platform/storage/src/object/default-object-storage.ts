import { createHash } from 'node:crypto';
import type { BlobStorage } from '../blob/blob-storage.js';
import type {
  GetObjectResult,
  ObjectMetadata,
  ObjectStorage,
  PutObjectRequest,
} from './object-storage.js';

/**
 * Reference `ObjectStorage`: layers content-type and etag metadata over a
 * `BlobStorage`. Metadata lives alongside the blob under a `.meta` key so
 * any `BlobStorage` implementation works underneath without changes.
 */
export class DefaultObjectStorage implements ObjectStorage {
  constructor(private readonly blobs: BlobStorage) {}

  async putObject(request: PutObjectRequest): Promise<ObjectMetadata> {
    const metadata: ObjectMetadata = {
      key: request.key,
      contentType: request.contentType,
      sizeBytes: request.data.byteLength,
      etag: createHash('sha256').update(request.data).digest('hex'),
      lastModified: new Date().toISOString(),
    };
    await this.blobs.put(request.key, request.data, request.contentType);
    await this.blobs.put(this.metaKey(request.key), Buffer.from(JSON.stringify(metadata)));
    return metadata;
  }

  async getObject(key: string): Promise<GetObjectResult | undefined> {
    const [data, metadata] = await Promise.all([this.blobs.get(key), this.headObject(key)]);
    if (data === undefined || metadata === undefined) return undefined;
    return { data, metadata };
  }

  async headObject(key: string): Promise<ObjectMetadata | undefined> {
    const raw = await this.blobs.get(this.metaKey(key));
    return raw === undefined ? undefined : (JSON.parse(raw.toString('utf8')) as ObjectMetadata);
  }

  async deleteObject(key: string): Promise<void> {
    await Promise.all([this.blobs.delete(key), this.blobs.delete(this.metaKey(key))]);
  }

  async listObjects(prefix: string): Promise<readonly ObjectMetadata[]> {
    const keys = await this.blobs.list(prefix);
    const metadataKeys = keys.filter((key) => !key.endsWith('.meta'));
    const metadata = await Promise.all(metadataKeys.map((key) => this.headObject(key)));
    return metadata.filter((entry): entry is ObjectMetadata => entry !== undefined);
  }

  presignedUrl(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  private metaKey(key: string): string {
    return `${key}.meta`;
  }
}
