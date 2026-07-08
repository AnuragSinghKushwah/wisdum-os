import {
  AttachWorkspaceHandler,
  CreateOrganizationHandler,
  GetOrganizationHandler,
} from '@wisdum/application';
import type { OrganizationReadModel } from '@wisdum/application';
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
  PG_POOL,
  SLUG_GENERATOR,
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

    const handlers: OrganizationHandlers = {
      create: new CreateOrganizationHandler(repository, ids, slugs, events, clock),
      attachWorkspace: new AttachWorkspaceHandler(repository, events, clock),
      get: new GetOrganizationHandler(readModel),
    };
    container.registerValue(ORGANIZATION_HANDLERS, handlers);
  }
}
