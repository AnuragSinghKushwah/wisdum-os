import {
  AddWorkspaceMemberHandler,
  CreateWorkspaceHandler,
  GetWorkspaceHandler,
  ListWorkspacesHandler,
  UpdateWorkspaceSettingsHandler,
} from '@wisdum/application';
import type { TenantResourceLookup, WorkspaceReadModel } from '@wisdum/application';
import type { WorkspaceRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryWorkspaceReadModel,
  InMemoryWorkspaceRepository,
  PostgresWorkspaceReadModel,
  PostgresWorkspaceRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import {
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  ORGANIZATION_READ_MODEL,
  PG_POOL,
  SLUG_GENERATOR,
  USER_READ_MODEL,
  WORKSPACE_HANDLERS,
  WORKSPACE_READ_MODEL,
} from '../tokens.js';
import type { WorkspaceHandlers } from '../tokens.js';

export class WorkspaceModule implements KernelModule {
  readonly name = 'workspace';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: WorkspaceRepository;
    let readModel: WorkspaceReadModel;
    if (pool !== undefined) {
      const postgresRepository = new PostgresWorkspaceRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresWorkspaceReadModel(postgresRepository);
    } else {
      const inMemoryRepository = new InMemoryWorkspaceRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryWorkspaceReadModel(inMemoryRepository);
    }
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const slugs = container.resolve(SLUG_GENERATOR);

    // Resolved when called: the organization and identity modules may be registered after this one.
    const organizations: TenantResourceLookup = {
      existsInTenant: async (tenantId, id) =>
        (await container.resolve(ORGANIZATION_READ_MODEL).findById(tenantId, id)) !== undefined,
    };
    const users: TenantResourceLookup = {
      existsInTenant: async (tenantId, id) =>
        (await container.resolve(USER_READ_MODEL).findById(tenantId, id)) !== undefined,
    };

    const handlers: WorkspaceHandlers = {
      create: new CreateWorkspaceHandler(repository, organizations, ids, slugs, events, clock),
      addMember: new AddWorkspaceMemberHandler(repository, users, events, clock),
      get: new GetWorkspaceHandler(readModel),
      list: new ListWorkspacesHandler(readModel),
      updateSettings: new UpdateWorkspaceSettingsHandler(repository, events, clock),
    };
    container.registerValue(WORKSPACE_HANDLERS, handlers);
    container.registerValue(WORKSPACE_READ_MODEL, readModel);
  }
}
