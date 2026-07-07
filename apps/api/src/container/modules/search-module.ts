import {
  CreateSearchIndexHandler,
  GetSearchIndexHandler,
  SearchIndexHandler,
} from '@wisdum/application';
import {
  EventBusDomainEventPublisher,
  InMemorySearchIndexReadModel,
  InMemorySearchIndexRepository,
  InMemorySearchProvider,
  ProviderSearchQueryExecutor,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { CLOCK, EVENT_BUS, ID_GENERATOR, SEARCH_HANDLERS } from '../tokens.js';
import type { SearchHandlers } from '../tokens.js';

export class SearchModule implements KernelModule {
  readonly name = 'search';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const repository = new InMemorySearchIndexRepository();
    const readModel = new InMemorySearchIndexReadModel(repository);
    const provider = new InMemorySearchProvider();
    const executor = new ProviderSearchQueryExecutor(provider);
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);

    const handlers: SearchHandlers = {
      createIndex: new CreateSearchIndexHandler(repository, ids, events, clock),
      search: new SearchIndexHandler(executor),
      getIndex: new GetSearchIndexHandler(readModel),
    };
    container.registerValue(SEARCH_HANDLERS, handlers);
  }
}
