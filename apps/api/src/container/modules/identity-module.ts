import { AssignRoleHandler, CreateUserHandler, GetUserHandler } from '@wisdum/application';
import {
  EventBusDomainEventPublisher,
  InMemoryUserReadModel,
  InMemoryUserRepository,
  ScryptPasswordHasher,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { CLOCK, EVENT_BUS, ID_GENERATOR, IDENTITY_HANDLERS } from '../tokens.js';
import type { IdentityHandlers } from '../tokens.js';

export class IdentityModule implements KernelModule {
  readonly name = 'identity';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const repository = new InMemoryUserRepository();
    const readModel = new InMemoryUserReadModel(repository);
    const hasher = new ScryptPasswordHasher();
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);

    const handlers: IdentityHandlers = {
      createUser: new CreateUserHandler(repository, ids, hasher, events, clock),
      assignRole: new AssignRoleHandler(repository, events, clock),
      getUser: new GetUserHandler(readModel),
    };
    container.registerValue(IDENTITY_HANDLERS, handlers);
  }
}
