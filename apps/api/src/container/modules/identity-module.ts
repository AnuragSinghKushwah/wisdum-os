import { AssignRoleHandler, CreateUserHandler, GetUserHandler } from '@wisdum/application';
import type { UserReadModel } from '@wisdum/application';
import type { UserRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryUserReadModel,
  InMemoryUserRepository,
  PostgresUserReadModel,
  PostgresUserRepository,
  ScryptPasswordHasher,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { CLOCK, EVENT_BUS, ID_GENERATOR, IDENTITY_HANDLERS, PG_POOL } from '../tokens.js';
import type { IdentityHandlers } from '../tokens.js';

export class IdentityModule implements KernelModule {
  readonly name = 'identity';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: UserRepository;
    let readModel: UserReadModel;
    if (pool !== undefined) {
      const postgresRepository = new PostgresUserRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresUserReadModel(postgresRepository);
    } else {
      const inMemoryRepository = new InMemoryUserRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryUserReadModel(inMemoryRepository);
    }
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
