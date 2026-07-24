import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import {
  Insight,
  InsightId,
  Opportunity,
  OpportunityId,
} from '@wisdum/domain';
import type { Clock, InsightRepository, OpportunityRepository } from '@wisdum/domain';
import type { DomainEventPublisher, IdGenerator } from '../../../shared/ports.js';
import { CreateOpportunityHandler } from '../create-opportunity-handler.js';
import { DismissOpportunityHandler } from '../dismiss-opportunity-handler.js';
import { NotFoundError } from '../../../shared/errors.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2026-07-24T00:00:00.000Z' as IsoTimestamp };

let eventLogs: unknown[] = [];
const events: DomainEventPublisher = {
  publishAll: (domainEvents) => {
    eventLogs.push(...domainEvents);
    return Promise.resolve();
  },
};

let idCounter = 0;
const ids: IdGenerator = {
  nextId: () => {
    idCounter += 1;
    return `00000000-0000-0000-0000-${idCounter.toString().padStart(12, '0')}` as UUID;
  },
};

class FakeInsightRepository implements InsightRepository {
  private readonly items = new Map<string, Insight>();

  findById(id: InsightId): Promise<Option<Insight>> {
    const item = this.items.get(id.value());
    return Promise.resolve(item ? { some: true, value: item } : { some: false });
  }

  save(insight: Insight): Promise<void> {
    this.items.set(insight.getId().value(), insight);
    return Promise.resolve();
  }

  delete(insight: Insight): Promise<void> {
    this.items.delete(insight.getId().value());
    return Promise.resolve();
  }

  exists(id: InsightId): Promise<boolean> {
    return Promise.resolve(this.items.has(id.value()));
  }
}

class FakeOpportunityRepository implements OpportunityRepository {
  private readonly items = new Map<string, Opportunity>();

  findById(id: OpportunityId): Promise<Option<Opportunity>> {
    const item = this.items.get(id.value());
    return Promise.resolve(item ? { some: true, value: item } : { some: false });
  }

  listByTenant(tenantId: TenantId): Promise<readonly Opportunity[]> {
    return Promise.resolve(Array.from(this.items.values()).filter(o => o.tenantId === tenantId));
  }

  save(opportunity: Opportunity): Promise<void> {
    this.items.set(opportunity.getId().value(), opportunity);
    return Promise.resolve();
  }

  delete(opportunity: Opportunity): Promise<void> {
    this.items.delete(opportunity.getId().value());
    return Promise.resolve();
  }

  exists(id: OpportunityId): Promise<boolean> {
    return Promise.resolve(this.items.has(id.value()));
  }
}

describe('Opportunity Application Handlers', () => {
  it('creates an Insight and a proposed Opportunity aggregate', async () => {
    eventLogs = [];
    const insightsRepo = new FakeInsightRepository();
    const oppRepo = new FakeOpportunityRepository();
    const handler = new CreateOpportunityHandler(oppRepo, insightsRepo, ids, events, clock);

    const result = await handler.execute({
      kind: 'command',
      tenantId: TENANT_ID,
      title: 'Redis Scaling Case Study',
      type: 'blog_post',
      rationale: 'High audience interest in Redis scaling patterns',
    });

    expect(result.opportunityId).toBeDefined();
    const fetched = await oppRepo.findById(OpportunityId.create(result.opportunityId as UUID));
    expect(fetched.some).toBe(true);
    if (fetched.some) {
      expect(fetched.value.title.value).toBe('Redis Scaling Case Study');
      expect(fetched.value.status.value).toBe('proposed');
      expect(fetched.value.type.value).toBe('blog_post');
    }
  });

  it('dismisses a proposed Opportunity', async () => {
    const insightsRepo = new FakeInsightRepository();
    const oppRepo = new FakeOpportunityRepository();
    const createHandler = new CreateOpportunityHandler(oppRepo, insightsRepo, ids, events, clock);
    const dismissHandler = new DismissOpportunityHandler(oppRepo, events, clock);

    const { opportunityId } = await createHandler.execute({
      kind: 'command',
      tenantId: TENANT_ID,
      title: 'Low Priority Article',
      type: 'blog_post',
      rationale: 'Outdated topic',
    });

    await dismissHandler.execute({
      kind: 'command',
      opportunityId,
      tenantId: TENANT_ID,
    });

    const fetched = await oppRepo.findById(OpportunityId.create(opportunityId as UUID));
    expect(fetched.some).toBe(true);
    if (fetched.some) {
      expect(fetched.value.status.value).toBe('dismissed');
    }
  });

  it('throws NotFoundError when dismissing non-existent opportunity', async () => {
    const oppRepo = new FakeOpportunityRepository();
    const dismissHandler = new DismissOpportunityHandler(oppRepo, events, clock);

    await expect(
      dismissHandler.execute({
        kind: 'command',
        opportunityId: '00000000-0000-0000-0000-000000000999',
        tenantId: TENANT_ID,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
