import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { some, none } from '@wisdum/types';
import { OrganizationId } from '@wisdum/domain';
import type { OrganizationRepository, Clock, Organization, OrganizationSlug } from '@wisdum/domain';
import { createOrganizationCommand } from '../../commands/create-organization-command.js';
import { attachWorkspaceCommand } from '../../commands/attach-workspace-command.js';
import { getOrganizationQuery } from '../../queries/get-organization-query.js';
import { CreateOrganizationHandler } from '../create-organization-handler.js';
import { AttachWorkspaceHandler } from '../attach-workspace-handler.js';
import { GetOrganizationHandler } from '../get-organization-handler.js';
import type { OrganizationReadModel } from '../../ports/organization-read-model.js';
import type { OrganizationDto } from '../../dto/organization-dto.js';
import type { DomainEventPublisher, SlugGenerator } from '../../../shared/ports.js';

class FakeOrganizationRepository implements OrganizationRepository {
  public items = new Map<string, Organization>();

  async save(organization: Organization): Promise<void> {
    this.items.set(organization.getId().value(), organization);
  }

  async findById(id: OrganizationId): Promise<Option<Organization>> {
    const item = this.items.get(id.value());
    if (item === undefined) return none;
    return some(item);
  }

  async findBySlug(slug: OrganizationSlug): Promise<Option<Organization>> {
    const item = Array.from(this.items.values()).find((o) => o.slug.value === slug.value);
    if (item === undefined) return none;
    return some(item);
  }

  async exists(id: OrganizationId): Promise<boolean> {
    return this.items.has(id.value());
  }

  async delete(): Promise<void> {}
  async listByTenant(): Promise<readonly Organization[]> {
    return [];
  }
}

class FakeOrganizationReadModel implements OrganizationReadModel {
  constructor(private repo: FakeOrganizationRepository) {}

  async findById(id: string): Promise<OrganizationDto | undefined> {
    const opt = await this.repo.findById(OrganizationId.create(id));
    if (!opt.some) return undefined;
    const org = (opt as { value: Organization }).value;
    return {
      id: org.getId().value(),
      name: org.name.value,
      slug: org.slug.value,
      status: org.status.value,
      plan: 'enterprise',
      workspaceCount: org.workspaceIds.length,
      createdAt: org.createdAt,
    };
  }

  async listByTenant(): Promise<readonly OrganizationDto[]> {
    return [];
  }
}

const mockClock: Clock = {
  now: () => '2026-07-27T12:00:00.000Z' as IsoTimestamp,
};

const mockIdGenerator = {
  nextId: () => '00000000-0000-4000-8000-000000000001' as UUID,
};

const mockSlugGenerator: SlugGenerator = {
  slugify: (text: string) => text.toLowerCase().replace(/\s+/g, '-'),
};

const mockEvents: DomainEventPublisher = {
  publishAll: async () => {},
};

describe('Organization Handlers', () => {
  it('CreateOrganizationHandler creates and persists organization aggregate', async () => {
    const repo = new FakeOrganizationRepository();
    const handler = new CreateOrganizationHandler(
      repo,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    );

    const result = await handler.execute(
      createOrganizationCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        name: 'Wisdum Inc',
      }),
    );

    expect(result.organizationId).toBe('00000000-0000-4000-8000-000000000001');
    const org = repo.items.get(result.organizationId);
    expect(org?.name.value).toBe('Wisdum Inc');
    expect(org?.slug.value).toBe('wisdum-inc');
  });

  it('AttachWorkspaceHandler attaches workspace to organization', async () => {
    const repo = new FakeOrganizationRepository();
    const createHandler = new CreateOrganizationHandler(
      repo,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    );
    const attachHandler = new AttachWorkspaceHandler(repo, mockEvents, mockClock);

    const { organizationId } = await createHandler.execute(
      createOrganizationCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        name: 'Acme Corp',
      }),
    );

    await attachHandler.execute(
      attachWorkspaceCommand({
        organizationId,
        workspaceId: '00000000-0000-4000-8000-000000000099',
      }),
    );

    const org = repo.items.get(organizationId);
    expect(org?.workspaceIds.length).toBe(1);
    expect(org?.workspaceIds[0]).toBe('00000000-0000-4000-8000-000000000099');
  });

  it('GetOrganizationHandler retrieves organization DTO', async () => {
    const repo = new FakeOrganizationRepository();
    const readModel = new FakeOrganizationReadModel(repo);
    const createHandler = new CreateOrganizationHandler(
      repo,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    );
    const getHandler = new GetOrganizationHandler(readModel);

    const { organizationId } = await createHandler.execute(
      createOrganizationCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        name: 'Global Tech',
      }),
    );

    const dto = await getHandler.execute(
      getOrganizationQuery({
        organizationId,
      }),
    );

    expect(dto).not.toBeUndefined();
    expect(dto?.name).toBe('Global Tech');
    expect(dto?.slug).toBe('global-tech');
  });
});
