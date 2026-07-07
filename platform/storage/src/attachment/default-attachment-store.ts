import { randomUUID } from 'node:crypto';
import type { ObjectStorage } from '../object/object-storage.js';
import type {
  AttachmentDownload,
  AttachmentReference,
  AttachmentStore,
} from './attachment-store.js';

const KEY_PREFIX = 'attachments';

/**
 * Reference `AttachmentStore`, layered over `ObjectStorage`. Keeps its own
 * id-to-key index since attachment ids (not raw object keys) are the
 * caller-facing handle.
 */
export class DefaultAttachmentStore implements AttachmentStore {
  private readonly keysById = new Map<string, string>();

  constructor(private readonly objects: ObjectStorage) {}

  async upload(
    ownerId: string,
    fileName: string,
    data: Buffer,
    contentType: string,
  ): Promise<AttachmentReference> {
    const id = randomUUID();
    const key = `${KEY_PREFIX}/${ownerId}/${id}/${fileName}`;
    const metadata = await this.objects.putObject({ key, data, contentType });
    this.keysById.set(id, key);
    return {
      id,
      ownerId,
      fileName,
      contentType: metadata.contentType,
      sizeBytes: metadata.sizeBytes,
      createdAt: metadata.lastModified,
    };
  }

  async download(attachmentId: string): Promise<AttachmentDownload | undefined> {
    const key = this.keysById.get(attachmentId);
    if (key === undefined) return undefined;
    const result = await this.objects.getObject(key);
    if (result === undefined) return undefined;
    return {
      data: result.data,
      reference: this.toReference(attachmentId, key, result.metadata),
    };
  }

  async listAttachments(ownerId: string): Promise<readonly AttachmentReference[]> {
    const objects = await this.objects.listObjects(`${KEY_PREFIX}/${ownerId}/`);
    return objects.map((metadata) => {
      const id = metadata.key.split('/')[2] ?? '';
      return this.toReference(id, metadata.key, metadata);
    });
  }

  async remove(attachmentId: string): Promise<void> {
    const key = this.keysById.get(attachmentId);
    if (key === undefined) return;
    await this.objects.deleteObject(key);
    this.keysById.delete(attachmentId);
  }

  private toReference(
    id: string,
    key: string,
    metadata: { contentType: string; sizeBytes: number; lastModified: string },
  ): AttachmentReference {
    const ownerId = key.split('/')[1] ?? '';
    const fileName = key.slice(key.lastIndexOf('/') + 1);
    return {
      id,
      ownerId,
      fileName,
      contentType: metadata.contentType,
      sizeBytes: metadata.sizeBytes,
      createdAt: metadata.lastModified,
    };
  }
}
