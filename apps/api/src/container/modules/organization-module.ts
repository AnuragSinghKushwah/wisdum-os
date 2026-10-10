import {
  AttachWorkspaceHandler,
  CreateOrganizationHandler,
  GetOrganizationHandler,
} from '@wisdum/application';
import type { OrganizationReadModel, TenantResourceLookup } from '@wisdum/application';
import type { OrganizationRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryOrganizationReadModel,
  InMemoryOrganizationRepository,
  PostgresOrganizationReadModel,
  PostgresOrganizationRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import {
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  ORGANIZATION_HANDLERS,
  ORGANIZATION_READ_MODEL,
  PG_POOL,
  SLUG_GENERATOR,
  WORKSPACE_READ_MODEL,
} from '../tokens.js';
import type { OrganizationHandlers } from '../tokens.js';

export class OrganizationModule implements KernelModule {
  readonly name = 'organization';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: OrganizationRepository;
    let readModel: OrganizationReadModel;
    if (pool !== undefined) {
      const postgresRepository = new PostgresOrganizationRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresOrganizationReadModel(postgresRepository);
    } else {
      const inMemoryRepository = new InMemoryOrganizationRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryOrganizationReadModel(inMemoryRepository);
    }
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const slugs = container.resolve(SLUG_GENERATOR);

    // Resolved when called: the workspace module may be registered after this one.
    const workspaces: TenantResourceLookup = {
      existsInTenant: async (tenantId, id) =>
        (await container.resolve(WORKSPACE_READ_MODEL).findById(tenantId, id)) !== undefined,
    };

    const handlers: OrganizationHandlers = {
      create: new CreateOrganizationHandler(repository, ids, slugs, events, clock),
      attachWorkspace: new AttachWorkspaceHandler(repository, workspaces, events, clock),
      get: new GetOrganizationHandler(readModel),
    };
    container.registerValue(ORGANIZATION_HANDLERS, handlers);
    container.registerValue(ORGANIZATION_READ_MODEL, readModel);
  }
}
