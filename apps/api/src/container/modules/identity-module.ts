import {
  AccessPolicy,
  AssignRoleHandler,
  AuthenticateApiKeyHandler,
  AuthenticateUserHandler,
  CreateUserHandler,
  GetUserHandler,
  CreateApiKeyHandler,
  RevokeApiKeyHandler,
  ListApiKeysHandler,
} from '@wisdum/application';
import type { UserReadModel, ApiKeyReadModel } from '@wisdum/application';
import type { UserRepository, ApiKeyRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryUserReadModel,
  InMemoryUserRepository,
  PostgresUserReadModel,
  PostgresUserRepository,
  ScryptPasswordHasher,
  Sha256ApiKeyHasher,
  PostgresApiKeyRepository,
  InMemoryApiKeyRepository,
  PostgresApiKeyReadModel,
  InMemoryApiKeyReadModel,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import {
  ACCESS_POLICY,
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  IDENTITY_HANDLERS,
  PG_POOL,
  TOKEN_SERVICE,
  API_KEY_READ_MODEL,
} from '../tokens.js';
import type { IdentityHandlers } from '../tokens.js';

export class IdentityModule implements KernelModule {
  readonly name = 'identity';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: UserRepository;
    let readModel: UserReadModel;
    let apiKeys: ApiKeyRepository;
    let apiKeyReads: ApiKeyReadModel;

    if (pool !== undefined) {
      const postgresRepository = new PostgresUserRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresUserReadModel(postgresRepository);
      apiKeys = new PostgresApiKeyRepository(pool);
      apiKeyReads = new PostgresApiKeyReadModel(pool);
    } else {
      const inMemoryRepository = new InMemoryUserRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryUserReadModel(inMemoryRepository);
      const inMemoryApiKeys = new InMemoryApiKeyRepository();
      apiKeys = inMemoryApiKeys;
      apiKeyReads = new InMemoryApiKeyReadModel(inMemoryApiKeys);
    }
    const hasher = new ScryptPasswordHasher();
    const apiKeyHasher = new Sha256ApiKeyHasher();
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const tokens = container.resolve(TOKEN_SERVICE);
    const access = new AccessPolicy();

    const handlers: IdentityHandlers = {
      createUser: new CreateUserHandler(repository, ids, hasher, events, clock),
      assignRole: new AssignRoleHandler(repository, access, events, clock),
      getUser: new GetUserHandler(readModel),
      authenticate: new AuthenticateUserHandler(repository, hasher, tokens),
      authenticateApiKey: new AuthenticateApiKeyHandler(apiKeys, apiKeyHasher, clock),
      createApiKey: new CreateApiKeyHandler(apiKeys, apiKeyHasher, ids, events, clock),
      revokeApiKey: new RevokeApiKeyHandler(apiKeys, events, clock),
      listApiKeys: new ListApiKeysHandler(apiKeyReads),
    };
    container.registerValue(IDENTITY_HANDLERS, handlers);
    container.registerValue(API_KEY_READ_MODEL, apiKeyReads);
    container.registerValue(ACCESS_POLICY, access);
  }
}
