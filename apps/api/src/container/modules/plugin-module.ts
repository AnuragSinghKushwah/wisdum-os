import {
  DisablePluginHandler,
  EnablePluginHandler,
  GetPluginHandler,
  InstallPluginHandler,
} from '@wisdum/application';
import type { PluginReadModel } from '@wisdum/application';
import type { PluginRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryPluginReadModel,
  InMemoryPluginRepository,
  PostgresPluginReadModel,
  PostgresPluginRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { CLOCK, EVENT_BUS, ID_GENERATOR, PG_POOL, PLUGIN_HANDLERS } from '../tokens.js';
import type { PluginHandlers } from '../tokens.js';

export class PluginModule implements KernelModule {
  readonly name = 'plugin';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: PluginRepository;
    let readModel: PluginReadModel;
    if (pool !== undefined) {
      const postgresRepository = new PostgresPluginRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresPluginReadModel(postgresRepository);
    } else {
      const inMemoryRepository = new InMemoryPluginRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryPluginReadModel(inMemoryRepository);
    }
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);

    const handlers: PluginHandlers = {
      install: new InstallPluginHandler(repository, ids, events, clock),
      enable: new EnablePluginHandler(repository, events, clock),
      disable: new DisablePluginHandler(repository, events, clock),
      get: new GetPluginHandler(readModel),
    };
    container.registerValue(PLUGIN_HANDLERS, handlers);
  }
}
