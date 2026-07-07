import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { Document } from '../entities/document.js';
import { ByteSize } from '../value-objects/byte-size.js';
import { ContentEncoding } from '../value-objects/content-encoding.js';
import { ContentHash } from '../value-objects/content-hash.js';
import { DocumentContent } from '../value-objects/document-content.js';
import { DocumentId } from '../value-objects/document-id.js';
import { MimeType } from '../value-objects/mime-type.js';
import {
  DocumentExceedsSize,
  DocumentIsActive,
  DocumentIsTextual,
} from './document-specifications.js';

const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createDocument(mimeType: string, sizeBytes: number) {
  return Document.create(
    {
      id: DocumentId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: 'tenant-1' as TenantId,
      content: DocumentContent.create('x'.repeat(sizeBytes)),
      mimeType: MimeType.create(mimeType),
      encoding: ContentEncoding.create('utf-8'),
      sizeBytes: ByteSize.create(sizeBytes),
      contentHash: ContentHash.create({ algorithm: 'sha-256', digest: 'a'.repeat(64) }),
    },
    clock,
  );
}

describe('Document specifications', () => {
  it('DocumentIsActive is satisfied for a freshly created document', () => {
    const document = createDocument('text/plain', 10);
    expect(new DocumentIsActive().isSatisfiedBy(document)).toBe(true);
  });

  it('DocumentIsActive is not satisfied once superseded', () => {
    const document = createDocument('text/plain', 10);
    document.supersede(DocumentId.create('22222222-2222-2222-2222-222222222222'), clock);
    expect(new DocumentIsActive().isSatisfiedBy(document)).toBe(false);
  });

  it('DocumentIsTextual reflects the MIME type primary type', () => {
    expect(new DocumentIsTextual().isSatisfiedBy(createDocument('text/markdown', 10))).toBe(true);
    expect(new DocumentIsTextual().isSatisfiedBy(createDocument('application/pdf', 10))).toBe(
      false,
    );
  });

  it('DocumentExceedsSize compares against the given limit', () => {
    const spec = new DocumentExceedsSize(ByteSize.create(100));
    expect(spec.isSatisfiedBy(createDocument('text/plain', 200))).toBe(true);
    expect(spec.isSatisfiedBy(createDocument('text/plain', 50))).toBe(false);
  });

  it('composes: an active, textual document under a size limit', () => {
    const spec = new DocumentIsActive()
      .and(new DocumentIsTextual())
      .and(new DocumentExceedsSize(ByteSize.create(100)).not());

    expect(spec.isSatisfiedBy(createDocument('text/plain', 10))).toBe(true);
    expect(spec.isSatisfiedBy(createDocument('application/pdf', 10))).toBe(false);
    expect(spec.isSatisfiedBy(createDocument('text/plain', 500))).toBe(false);
  });
});
