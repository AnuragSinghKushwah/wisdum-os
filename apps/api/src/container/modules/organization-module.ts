import {
  AttachWorkspaceHandler,
  CreateOrganizationHandler,
  GetOrganizationHandler,
} from '@wisdum/application';
import {
  EventBusDomainEventPublisher,
  InMemoryOrganizationReadModel,
  InMemoryOrganizationRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import {
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  ORGANIZATION_HANDLERS,
  SLUG_GENERATOR,
} from '../tokens.js';
import type { OrganizationHandlers } from '../tokens.js';

export class OrganizationModule implements KernelModule {
  readonly name = 'organization';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const repository = new InMemoryOrganizationRepository();
    const readModel = new InMemoryOrganizationReadModel(repository);
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
