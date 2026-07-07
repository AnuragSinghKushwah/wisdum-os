import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import {
  DOCUMENT_CREATED,
  DOCUMENT_DELETED,
  DOCUMENT_SUPERSEDED,
} from '../events/document-events.js';
import { ByteSize } from '../value-objects/byte-size.js';
import { ContentEncoding } from '../value-objects/content-encoding.js';
import { ContentHash } from '../value-objects/content-hash.js';
import { DocumentContent } from '../value-objects/document-content.js';
import { DocumentId } from '../value-objects/document-id.js';
import { MimeType } from '../value-objects/mime-type.js';
import { Document } from './document.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createDocument() {
  return Document.create(
    {
      id: DocumentId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      content: DocumentContent.create('hello world'),
      mimeType: MimeType.create('text/plain'),
      encoding: ContentEncoding.create('utf-8'),
      sizeBytes: ByteSize.create(11),
      contentHash: ContentHash.create({ algorithm: 'sha-256', digest: 'a'.repeat(64) }),
    },
    clock,
  );
}

describe('Document', () => {
  it('is created active and raises DocumentCreated', () => {
    const document = createDocument();
    expect(document.status.is('active')).toBe(true);
    const events = document.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe(DOCUMENT_CREATED);
  });

  it('replaceContent() replaces hash, size, and encoding together', () => {
    const document = createDocument();
    document.clearDomainEvents();

    document.replaceContent(
      {
        content: DocumentContent.create('new content'),
        contentHash: ContentHash.create({ algorithm: 'sha-256', digest: 'b'.repeat(64) }),
        sizeBytes: ByteSize.create(11),
        encoding: ContentEncoding.create('utf-8'),
      },
      clock,
    );

    expect(document.content.value).toBe('new content');
    expect(document.contentHash.toString()).toContain('b'.repeat(64));
  });

  it('replaceContent() is a no-op when the hash is unchanged', () => {
    const document = createDocument();
    document.clearDomainEvents();
    const sameHash = document.contentHash;

    document.replaceContent(
      {
        content: document.content,
        contentHash: sameHash,
        sizeBytes: document.sizeBytes,
        encoding: document.encoding,
      },
      clock,
    );

    expect(document.pullDomainEvents()).toHaveLength(0);
  });

  it('supersede() cannot target itself', () => {
    const document = createDocument();
    expect(() => document.supersede(document.getId(), clock)).toThrow(/cannot supersede itself/i);
  });

  it('supersede() transitions to superseded and raises DocumentSuperseded', () => {
    const document = createDocument();
    document.clearDomainEvents();
    const other = DocumentId.create('22222222-2222-2222-2222-222222222222');

    document.supersede(other, clock);

    expect(document.status.is('superseded')).toBe(true);
    const events = document.pullDomainEvents();
    expect(events.some((event) => event.eventType === DOCUMENT_SUPERSEDED)).toBe(true);
  });

  it('a superseded document can no longer be modified', () => {
    const document = createDocument();
    document.supersede(DocumentId.create('22222222-2222-2222-2222-222222222222'), clock);

    expect(() =>
      document.replaceContent(
        {
          content: DocumentContent.create('x'),
          contentHash: ContentHash.create({ algorithm: 'sha-256', digest: 'c'.repeat(64) }),
          sizeBytes: ByteSize.create(1),
          encoding: document.encoding,
        },
        clock,
      ),
    ).toThrow(/cannot be modified/i);
  });

  it('markDeleted() is terminal and idempotent', () => {
    const document = createDocument();
    document.clearDomainEvents();

    document.markDeleted(clock);
    expect(document.status.is('deleted')).toBe(true);
    expect(document.pullDomainEvents().some((event) => event.eventType === DOCUMENT_DELETED)).toBe(
      true,
    );

    document.clearDomainEvents();
    document.markDeleted(clock);
    expect(document.pullDomainEvents()).toHaveLength(0);
  });
});
