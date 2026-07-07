import {
  AddWorkspaceMemberHandler,
  CreateWorkspaceHandler,
  GetWorkspaceHandler,
} from '@wisdum/application';
import {
  EventBusDomainEventPublisher,
  InMemoryWorkspaceReadModel,
  InMemoryWorkspaceRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { CLOCK, EVENT_BUS, ID_GENERATOR, SLUG_GENERATOR, WORKSPACE_HANDLERS } from '../tokens.js';
import type { WorkspaceHandlers } from '../tokens.js';

export class WorkspaceModule implements KernelModule {
  readonly name = 'workspace';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const repository = new InMemoryWorkspaceRepository();
    const readModel = new InMemoryWorkspaceReadModel(repository);
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
