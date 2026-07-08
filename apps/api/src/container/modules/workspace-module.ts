import {
  AddWorkspaceMemberHandler,
  CreateWorkspaceHandler,
  GetWorkspaceHandler,
} from '@wisdum/application';
import type { WorkspaceReadModel } from '@wisdum/application';
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
  PG_POOL,
  SLUG_GENERATOR,
  WORKSPACE_HANDLERS,
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

    const handlers: WorkspaceHandlers = {
      create: new CreateWorkspaceHandler(repository, ids, slugs, events, clock),
      addMember: new AddWorkspaceMemberHandler(repository, events, clock),
      get: new GetWorkspaceHandler(readModel),
    };
    container.registerValue(WORKSPACE_HANDLERS, handlers);
  }
}
