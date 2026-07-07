export interface AttachmentReference {
  readonly id: string;
  readonly ownerId: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export interface AttachmentDownload {
  readonly data: Buffer;
  readonly reference: AttachmentReference;
}

/**
 * User-facing file uploads attached to an entity, preserving the original
 * filename. Distinct from `ArtifactStore`: attachments are user-provided,
 * one owner may have many, and each gets its own generated id.
 */
export interface AttachmentStore {
  upload(
    ownerId: string,
    fileName: string,
    data: Buffer,
    contentType: string,
  ): Promise<AttachmentReference>;
  download(attachmentId: string): Promise<AttachmentDownload | undefined>;
  listAttachments(ownerId: string): Promise<readonly AttachmentReference[]>;
  remove(attachmentId: string): Promise<void>;
}
