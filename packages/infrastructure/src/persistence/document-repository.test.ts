import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import {
  ByteSize,
  ContentEncoding,
  ContentHash,
  Document,
  DocumentContent,
  DocumentId,
  MimeType,
} from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import { assertRepositoryContract } from './repository-contract.test-helper.js';
import { InMemoryDocumentRepository } from './document-repository.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createDocument(id: string, digest: string) {
  return Document.create(
    {
      id: DocumentId.create(id),
      tenantId: TENANT_ID,
      content: DocumentContent.create('hello'),
      mimeType: MimeType.create('text/plain'),
      encoding: ContentEncoding.create('utf-8'),
      sizeBytes: ByteSize.create(5),
      contentHash: ContentHash.create({ algorithm: 'sha-256', digest }),
    },
    clock,
  );
}

describe('InMemoryDocumentRepository', () => {
  it('satisfies the generic Repository contract', async () => {
    const repository = new InMemoryDocumentRepository();
    const id = DocumentId.create('11111111-1111-1111-1111-111111111111');
    await assertRepositoryContract(repository, createDocument(id.value(), 'a'.repeat(64)), id);
  });

  it('findByContentHash() is tenant-scoped', async () => {
    const repository = new InMemoryDocumentRepository();
    const digest = 'b'.repeat(64);
    await repository.save(createDocument('11111111-1111-1111-1111-111111111111', digest));

    const hash = ContentHash.create({ algorithm: 'sha-256', digest });
    const found = await repository.findByContentHash(TENANT_ID, hash);
    expect(found.some).toBe(true);

    const otherTenant = await repository.findByContentHash('tenant-2' as TenantId, hash);
    expect(otherTenant.some).toBe(false);
  });
});
