import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { S3BlobStorage } from './s3-blob-storage.js';
import type { S3ClientLike } from './s3-blob-storage.js';

class FakeS3Client implements S3ClientLike {
  private readonly objects = new Map<string, { body: Buffer; contentType?: string }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async send(command: any): Promise<any> {
    if (command instanceof PutObjectCommand) {
      const { Key, Body, ContentType } = command.input;
      this.objects.set(Key as string, {
        body: Buffer.isBuffer(Body) ? Body : Buffer.from(Body as Uint8Array),
        contentType: ContentType as string | undefined,
      });
      return {};
    }
    if (command instanceof GetObjectCommand) {
      const object = this.objects.get(command.input.Key as string);
      if (object === undefined) {
        const error = new Error('The specified key does not exist.');
        error.name = 'NoSuchKey';
        throw error;
      }
      return { Body: Readable.from([object.body]) };
    }
    if (command instanceof DeleteObjectCommand) {
      this.objects.delete(command.input.Key as string);
      return {};
    }
    if (command instanceof ListObjectsV2Command) {
      const prefix = (command.input.Prefix as string | undefined) ?? '';
      const keys = [...this.objects.keys()].filter((key) => key.startsWith(prefix));
      return { Contents: keys.map((key) => ({ Key: key })), IsTruncated: false };
    }
    throw new Error(`Unhandled command: ${String(command)}`);
  }
}

describe('S3BlobStorage', () => {
  it('put() then get() round-trips the exact bytes', async () => {
    const storage = new S3BlobStorage(new FakeS3Client(), 'test-bucket');
    await storage.put('docs/hello.txt', Buffer.from('hello world'), 'text/plain');
    await expect(storage.get('docs/hello.txt')).resolves.toEqual(Buffer.from('hello world'));
  });

  it('get() returns undefined for a missing key (NoSuchKey)', async () => {
    const storage = new S3BlobStorage(new FakeS3Client(), 'test-bucket');
    await expect(storage.get('missing')).resolves.toBeUndefined();
  });

  it('delete() removes the key', async () => {
    const storage = new S3BlobStorage(new FakeS3Client(), 'test-bucket');
    await storage.put('key-1', Buffer.from('x'));
    await storage.delete('key-1');
    await expect(storage.get('key-1')).resolves.toBeUndefined();
  });

  it('list(prefix) returns only keys under that prefix', async () => {
    const storage = new S3BlobStorage(new FakeS3Client(), 'test-bucket');
    await storage.put('knowledge/1/content', Buffer.from('a'));
    await storage.put('knowledge/2/content', Buffer.from('b'));
    await storage.put('documents/1/content', Buffer.from('c'));

    const keys = await storage.list('knowledge/');

    expect([...keys].sort()).toEqual(['knowledge/1/content', 'knowledge/2/content']);
  });
});
