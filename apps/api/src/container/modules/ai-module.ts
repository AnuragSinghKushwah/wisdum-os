import {
  AppendMessageHandler,
  GetConversationHandler,
  StartConversationHandler,
} from '@wisdum/application';
import {
  EventBusDomainEventPublisher,
  InMemoryConversationReadModel,
  InMemoryConversationRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { AI_HANDLERS, CLOCK, EVENT_BUS, ID_GENERATOR } from '../tokens.js';
import type { AiHandlers } from '../tokens.js';

export class AiModule implements KernelModule {
  readonly name = 'ai';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const repository = new InMemoryConversationRepository();
    const readModel = new InMemoryConversationReadModel(repository);
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
