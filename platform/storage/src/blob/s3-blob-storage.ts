import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type {
  DeleteObjectCommandOutput,
  GetObjectCommandOutput,
  ListObjectsV2CommandOutput,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import type { BlobStorage } from './blob-storage.js';

/**
 * The subset of `S3Client` this adapter depends on. Keeping the
 * dependency this narrow lets the store be unit-tested against an
 * in-process fake instead of a running S3-compatible service.
 */
export interface S3ClientLike {
  send(command: PutObjectCommand): Promise<PutObjectCommandOutput>;
  send(command: GetObjectCommand): Promise<GetObjectCommandOutput>;
  send(command: DeleteObjectCommand): Promise<DeleteObjectCommandOutput>;
  send(command: ListObjectsV2Command): Promise<ListObjectsV2CommandOutput>;
}

function isNoSuchKey(error: unknown): boolean {
  return (
    error instanceof Error && ('name' in error ? error.name : undefined) === 'NoSuchKey'
  );
}

async function bufferFromBody(body: GetObjectCommandOutput['Body']): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/** S3-compatible `BlobStorage` (AWS S3, MinIO, or any S3-compatible endpoint). */
export class S3BlobStorage implements BlobStorage {
  constructor(
    private readonly client: S3ClientLike,
    private readonly bucket: string,
  ) {}

  async put(key: string, data: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer | undefined> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (result.Body === undefined) return undefined;
      return await bufferFromBody(result.Body);
    } catch (error) {
      if (isNoSuchKey(error)) return undefined;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async list(prefix: string): Promise<readonly string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of result.Contents ?? []) {
        if (object.Key !== undefined) keys.push(object.Key);
      }
      continuationToken = result.IsTruncated === true ? result.NextContinuationToken : undefined;
    } while (continuationToken !== undefined);
    return keys;
  }
}
