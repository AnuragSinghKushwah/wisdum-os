export interface ObjectMetadata {
  readonly key: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly etag: string;
  readonly lastModified: string;
}

export interface PutObjectRequest {
  readonly key: string;
  readonly data: Buffer;
  readonly contentType: string;
}

export interface GetObjectResult {
  readonly data: Buffer;
  readonly metadata: ObjectMetadata;
}

/**
 * S3-compatible object storage: content-typed objects with metadata,
 * layered over a `BlobStorage`. Cloud providers and self-hosted MinIO
 * integrate behind this contract as plugins.
 */
export interface ObjectStorage {
  putObject(request: PutObjectRequest): Promise<ObjectMetadata>;
  getObject(key: string): Promise<GetObjectResult | undefined>;
  headObject(key: string): Promise<ObjectMetadata | undefined>;
  deleteObject(key: string): Promise<void>;
  listObjects(prefix: string): Promise<readonly ObjectMetadata[]>;
  /** A time-limited URL for direct client access. `undefined` if the provider can't generate one. */
  presignedUrl(key: string, expiresInSeconds: number): Promise<string | undefined>;
}
