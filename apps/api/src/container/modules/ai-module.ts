import {
  AppendMessageHandler,
  GetConversationHandler,
  StartConversationHandler,
} from '@wisdum/application';
import type { ConversationReadModel } from '@wisdum/application';
import type { ConversationRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryConversationReadModel,
  InMemoryConversationRepository,
  PostgresConversationReadModel,
  PostgresConversationRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { AI_HANDLERS, CLOCK, EVENT_BUS, ID_GENERATOR, PG_POOL } from '../tokens.js';
import type { AiHandlers } from '../tokens.js';

export class AiModule implements KernelModule {
  readonly name = 'ai';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: ConversationRepository;
    let readModel: ConversationReadModel;
    if (pool !== undefined) {
      const postgresRepository = new PostgresConversationRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresConversationReadModel(postgresRepository);
    } else {
      const inMemoryRepository = new InMemoryConversationRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryConversationReadModel(inMemoryRepository);
    }
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);

    const handlers: AiHandlers = {
      startConversation: new StartConversationHandler(repository, ids, events, clock),
      appendMessage: new AppendMessageHandler(repository, events, clock),
      getConversation: new GetConversationHandler(readModel),
    };
    container.registerValue(AI_HANDLERS, handlers);
  }
}
