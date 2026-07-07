export interface ArtifactReference {
  readonly ownerId: string;
  readonly artifactType: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

/**
 * Stores generated artifacts (thumbnails, extracted text, processed
 * exports) associated with an owning entity. One artifact per
 * `(ownerId, artifactType)` pair — regenerating replaces the prior one.
 */
export interface ArtifactStore {
  store(
    ownerId: string,
    artifactType: string,
    data: Buffer,
    contentType: string,
  ): Promise<ArtifactReference>;
  retrieve(ownerId: string, artifactType: string): Promise<Buffer | undefined>;
  listArtifacts(ownerId: string): Promise<readonly ArtifactReference[]>;
  remove(ownerId: string, artifactType: string): Promise<void>;
}
