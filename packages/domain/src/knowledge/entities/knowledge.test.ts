import { describe, expect, it } from 'vitest';
import type { Clock } from '../../shared/index.js';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { KNOWLEDGE_CREATED, KNOWLEDGE_ARCHIVED } from '../events/knowledge-events.js';
import { ContentReference } from '../value-objects/content-reference.js';
import { KnowledgeId } from '../value-objects/knowledge-id.js';
import { KnowledgeSlug } from '../value-objects/knowledge-slug.js';
import { KnowledgeSource } from '../value-objects/knowledge-source.js';
import { KnowledgeTitle } from '../value-objects/knowledge-title.js';
import { KnowledgeType } from '../value-objects/knowledge-type.js';
import { KnowledgeVisibility } from '../value-objects/knowledge-visibility.js';
import { Knowledge } from './knowledge.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createKnowledge() {
  return Knowledge.create(
    {
      id: KnowledgeId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      title: KnowledgeTitle.create('My Asset'),
      slug: KnowledgeSlug.create('my-asset'),
      type: KnowledgeType.create('document'),
      visibility: KnowledgeVisibility.create('private'),
      source: KnowledgeSource.create({ kind: 'manual' }),
    },
    clock,
  );
}

describe('Knowledge', () => {
  it('is created in draft status and raises KnowledgeCreated', () => {
    const knowledge = createKnowledge();
    expect(knowledge.status.is('draft')).toBe(true);

    const events = knowledge.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe(KNOWLEDGE_CREATED);
  });

  it('starts at version 1 with no labels or content references', () => {
    const knowledge = createKnowledge();
    expect(knowledge.version.value).toBe(1);
    expect(knowledge.labels).toHaveLength(0);
    expect(knowledge.contentReferences).toHaveLength(0);
  });

  it('archive() transitions from draft to archived and raises KnowledgeArchived', () => {
    const knowledge = createKnowledge();
    knowledge.clearDomainEvents();

    knowledge.archive(clock);

    expect(knowledge.status.is('archived')).toBe(true);
    const events = knowledge.pullDomainEvents();
    expect(events.some((event) => event.eventType === KNOWLEDGE_ARCHIVED)).toBe(true);
  });

  it('restore() only succeeds from archived status, per the domain invariant', () => {
    const knowledge = createKnowledge();
    expect(() => knowledge.restore(clock)).toThrow(/only archived/i);

    knowledge.archive(clock);
    expect(() => knowledge.restore(clock)).not.toThrow();
    expect(knowledge.status.is('active')).toBe(true);
  });

  it('completeImport() requires import to have started first', () => {
    const knowledge = createKnowledge();
    const reference = ContentReference.create({ reference: 's3://bucket/key' });
    expect(() => knowledge.completeImport(reference, clock)).toThrow(/cannot complete/i);

    knowledge.beginImport(clock);
    expect(() => knowledge.completeImport(reference, clock)).not.toThrow();
    expect(knowledge.status.is('active')).toBe(true);
    expect(knowledge.contentReferences).toHaveLength(1);
  });

  it('reconstitute() rehydrates state without raising any events', () => {
    const original = createKnowledge();
    original.clearDomainEvents();

    const snapshot = {
      id: original.getId(),
      tenantId: original.tenantId,
      title: original.title,
      slug: original.slug,
      description: original.description,
      type: original.type,
      status: original.status,
      visibility: original.visibility,
      source: original.source,
      version: original.version,
      labels: original.labels,
      properties: original.properties,
      contentReferences: original.contentReferences,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
      processingStartedAt: null,
      processedAt: null,
    };

    const rehydrated = Knowledge.reconstitute(snapshot);
    expect(rehydrated.pullDomainEvents()).toHaveLength(0);
    expect(rehydrated.getId().equals(original.getId())).toBe(true);
    expect(rehydrated.title.equals(original.title)).toBe(true);
  });
});
