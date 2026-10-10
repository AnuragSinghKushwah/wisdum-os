import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { some, none } from '@wisdum/types';
import { WorkspaceId } from '@wisdum/domain';
import type { WorkspaceRepository, Clock, Workspace, WorkspaceSlug } from '@wisdum/domain';
import { createWorkspaceCommand } from '../../commands/create-workspace-command.js';
import { addWorkspaceMemberCommand } from '../../commands/add-workspace-member-command.js';
import { getWorkspaceQuery } from '../../queries/get-workspace-query.js';
import { listWorkspacesQuery } from '../../queries/list-workspaces-query.js';
import { CreateWorkspaceHandler } from '../create-workspace-handler.js';
import { AddWorkspaceMemberHandler } from '../add-workspace-member-handler.js';
import { GetWorkspaceHandler } from '../get-workspace-handler.js';
import { ListWorkspacesHandler } from '../list-workspaces-handler.js';
import type { WorkspaceReadModel } from '../../ports/workspace-read-model.js';
import type { WorkspaceDto } from '../../dto/workspace-dto.js';
import type {
  DomainEventPublisher,
  SlugGenerator,
  TenantResourceLookup,
} from '../../../shared/ports.js';

class FakeWorkspaceRepository implements WorkspaceRepository {
  public items = new Map<string, Workspace>();

  async save(workspace: Workspace): Promise<void> {
    this.items.set(workspace.getId().value(), workspace);
  }

  async findById(id: WorkspaceId): Promise<Option<Workspace>> {
    const item = this.items.get(id.value());
    if (item === undefined) return none;
    return some(item);
  }

  async findBySlug(tenantId: TenantId, slug: WorkspaceSlug): Promise<Option<Workspace>> {
    const item = Array.from(this.items.values()).find(
      (w) => w.tenantId === tenantId && w.slug.value === slug.value,
    );
    if (item === undefined) return none;
    return some(item);
  }

  async findByOrganization(
    tenantId: TenantId,
    organizationId: UUID,
  ): Promise<readonly Workspace[]> {
    return Array.from(this.items.values()).filter(
      (w) => w.tenantId === tenantId && w.organizationId === organizationId,
    );
  }

  async findByTenant(tenantId: TenantId): Promise<readonly Workspace[]> {
    return Array.from(this.items.values()).filter((w) => w.tenantId === tenantId);
  }

  async exists(id: WorkspaceId): Promise<boolean> {
    return this.items.has(id.value());
  }

  async delete(): Promise<void> {}
  async listByTenant(): Promise<readonly Workspace[]> {
    return Array.from(this.items.values());
  }
}

class FakeWorkspaceReadModel implements WorkspaceReadModel {
  constructor(private repo: FakeWorkspaceRepository) {}

  async findById(tenantId: TenantId, id: string): Promise<WorkspaceDto | undefined> {
    const opt = await this.repo.findById(WorkspaceId.create(id));
    if (!opt.some || opt.value.tenantId !== tenantId) return undefined;
    const ws = (opt as { value: Workspace }).value;
    return {
      id: ws.getId().value(),
      organizationId: ws.organizationId,
      name: ws.name.value,
      slug: ws.slug.value,
      status: ws.status.value,
      settings: ws.settings.toRecord(),
      memberCount: ws.memberCount(),
      createdAt: ws.createdAt,
    };
  }

  async listByOrganization(): Promise<readonly WorkspaceDto[]> {
    return [];
  }

  async listByTenant(tenantId: TenantId): Promise<readonly WorkspaceDto[]> {
    const workspaces = await this.repo.findByTenant(tenantId);
    return workspaces.map((ws) => ({
      id: ws.getId().value(),
      organizationId: ws.organizationId,
      name: ws.name.value,
      slug: ws.slug.value,
      status: ws.status.value,
      settings: ws.settings.toRecord(),
      memberCount: ws.memberCount(),
      createdAt: ws.createdAt,
    }));
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

/** A lookup that finds everything in the one tenant these tests use. */
const TEST_TENANT = '00000000-0000-4000-8000-000000000001';
const everythingExists: TenantResourceLookup = {
  existsInTenant: async (tenantId) => tenantId === TEST_TENANT,
};
const nothingExists: TenantResourceLookup = { existsInTenant: async () => false };

describe('Workspace Handlers', () => {
  it('CreateWorkspaceHandler creates and persists workspace aggregate', async () => {
    const repo = new FakeWorkspaceRepository();
    const handler = new CreateWorkspaceHandler(
      repo,
      everythingExists,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    );

    const result = await handler.execute(
      createWorkspaceCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        organizationId: '00000000-0000-4000-8000-000000000002' as UUID,
        name: 'Engineering Workspace',
        createdBy: '00000000-0000-4000-8000-000000000003' as UUID,
      }),
    );

    expect(result.workspaceId).toBe('00000000-0000-4000-8000-000000000001');
    const ws = repo.items.get(result.workspaceId);
    expect(ws?.name.value).toBe('Engineering Workspace');
    expect(ws?.members.length).toBe(1);
  });

  it('AddWorkspaceMemberHandler adds member to existing workspace', async () => {
    const repo = new FakeWorkspaceRepository();
    const createHandler = new CreateWorkspaceHandler(
      repo,
      everythingExists,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    );
    const addMemberHandler = new AddWorkspaceMemberHandler(
      repo,
      everythingExists,
      mockEvents,
      mockClock,
    );

    const { workspaceId } = await createHandler.execute(
      createWorkspaceCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        organizationId: '00000000-0000-4000-8000-000000000002' as UUID,
        name: 'Product Team',
        createdBy: '00000000-0000-4000-8000-000000000003' as UUID,
      }),
    );

    await addMemberHandler.execute(
      addWorkspaceMemberCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        workspaceId,
        userId: '00000000-0000-4000-8000-000000000004' as UUID,
        role: 'member',
      }),
    );

    const ws = repo.items.get(workspaceId);
    expect(ws?.members.length).toBe(2);
  });

  it('GetWorkspaceHandler and ListWorkspacesHandler query workspace read models', async () => {
    const repo = new FakeWorkspaceRepository();
    const readModel = new FakeWorkspaceReadModel(repo);
    const createHandler = new CreateWorkspaceHandler(
      repo,
      everythingExists,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    );
    const getHandler = new GetWorkspaceHandler(readModel);
    const listHandler = new ListWorkspacesHandler(readModel);

    const { workspaceId } = await createHandler.execute(
      createWorkspaceCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        organizationId: '00000000-0000-4000-8000-000000000002' as UUID,
        name: 'Design Studio',
        createdBy: '00000000-0000-4000-8000-000000000003' as UUID,
      }),
    );

    const dto = await getHandler.execute(
      getWorkspaceQuery({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        workspaceId,
      }),
    );

    expect(dto).not.toBeUndefined();
    expect(dto?.name).toBe('Design Studio');

    const list = await listHandler.execute(
      listWorkspacesQuery({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
      }),
    );

    expect(list.length).toBe(1);
    expect(list[0]?.slug).toBe('design-studio');
  });

  it("CreateWorkspaceHandler refuses an organization that is not in the caller's tenant", async () => {
    const repo = new FakeWorkspaceRepository();
    const handler = new CreateWorkspaceHandler(
      repo,
      nothingExists,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    );

    await expect(
      handler.execute(
        createWorkspaceCommand({
          tenantId: TEST_TENANT as TenantId,
          organizationId: '00000000-0000-4000-8000-000000000002' as UUID,
          name: 'Sneaky',
          createdBy: '00000000-0000-4000-8000-000000000003' as UUID,
        }),
      ),
    ).rejects.toThrow('Organization not found');
    expect(repo.items.size).toBe(0);
  });

  it("AddWorkspaceMemberHandler refuses a user who is not in the workspace's tenant", async () => {
    const repo = new FakeWorkspaceRepository();
    const { workspaceId } = await new CreateWorkspaceHandler(
      repo,
      everythingExists,
      mockIdGenerator,
      mockSlugGenerator,
      mockEvents,
      mockClock,
    ).execute(
      createWorkspaceCommand({
        tenantId: TEST_TENANT as TenantId,
        organizationId: '00000000-0000-4000-8000-000000000002' as UUID,
        name: 'Product Team',
        createdBy: '00000000-0000-4000-8000-000000000003' as UUID,
      }),
    );

    await expect(
      new AddWorkspaceMemberHandler(repo, nothingExists, mockEvents, mockClock).execute(
        addWorkspaceMemberCommand({
          tenantId: TEST_TENANT as TenantId,
          workspaceId,
          userId: '00000000-0000-4000-8000-000000000004' as UUID,
          role: 'member',
        }),
      ),
    ).rejects.toThrow('User not found');
    expect(repo.items.get(workspaceId)?.members.length).toBe(1);
  });
});
