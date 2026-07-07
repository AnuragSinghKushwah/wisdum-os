import type { ObjectStorage } from '../object/object-storage.js';
import type { ArtifactReference, ArtifactStore } from './artifact-store.js';

const KEY_PREFIX = 'artifacts';

/** Reference `ArtifactStore`: one object per `(ownerId, artifactType)`, layered over `ObjectStorage`. */
export class DefaultArtifactStore implements ArtifactStore {
  constructor(private readonly objects: ObjectStorage) {}

  async store(
    ownerId: string,
    artifactType: string,
    data: Buffer,
    contentType: string,
  ): Promise<ArtifactReference> {
    const metadata = await this.objects.putObject({
      key: this.key(ownerId, artifactType),
      data,
      contentType,
    });
    return {
      ownerId,
      artifactType,
      contentType: metadata.contentType,
      sizeBytes: metadata.sizeBytes,
      createdAt: metadata.lastModified,
    };
  }

  async retrieve(ownerId: string, artifactType: string): Promise<Buffer | undefined> {
    const result = await this.objects.getObject(this.key(ownerId, artifactType));
    return result?.data;
  }

  async listArtifacts(ownerId: string): Promise<readonly ArtifactReference[]> {
    const objects = await this.objects.listObjects(`${KEY_PREFIX}/${ownerId}/`);
    return objects.map((metadata) => ({
      ownerId,
      artifactType: metadata.key.slice(metadata.key.lastIndexOf('/') + 1),
      contentType: metadata.contentType,
      sizeBytes: metadata.sizeBytes,
      createdAt: metadata.lastModified,
    }));
  }

  async remove(ownerId: string, artifactType: string): Promise<void> {
    await this.objects.deleteObject(this.key(ownerId, artifactType));
  }

  private key(ownerId: string, artifactType: string): string {
    return `${KEY_PREFIX}/${ownerId}/${artifactType}`;
  }
}
