import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  AppendMessageHandler,
  GetConversationHandler,
  StartConversationHandler,
} from '@wisdum/application';
import type { ConversationReadModel } from '@wisdum/application';
import type { ConversationRepository } from '@wisdum/domain';
import { optionalEnv } from '@wisdum/config';
import {
  EventBusDomainEventPublisher,
  InMemoryConversationReadModel,
  InMemoryConversationRepository,
  PostgresConversationReadModel,
  PostgresConversationRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import {
  AnthropicLlmProvider,
  AssistantConversationRuntime,
  OpenAiLlmProvider,
  TruncatingContextBuilder,
} from '@wisdum/platform-ai';
import type { ConversationRuntime, LlmProvider } from '@wisdum/platform-ai';
import {
  AI_HANDLERS,
  CLOCK,
  CONVERSATION_RUNTIME,
  EVENT_BUS,
  ID_GENERATOR,
  PG_POOL,
} from '../tokens.js';
import type { AiHandlers } from '../tokens.js';

/**
 * Picks a real `LlmProvider` from whichever provider API key is present
 * (Anthropic takes precedence when both are set). Neither vendor SDK is
 * referenced outside this composition root — `platform/ai`'s adapters
 * depend only on the narrow client shape they call.
 */
function createLlmProvider(): LlmProvider | undefined {
  const anthropicKey = optionalEnv('ANTHROPIC_API_KEY', '');
  if (anthropicKey.length > 0) {
    return new AnthropicLlmProvider(new Anthropic({ apiKey: anthropicKey }));
  }
  const openAiKey = optionalEnv('OPENAI_API_KEY', '');
  if (openAiKey.length > 0) {
    return new OpenAiLlmProvider(new OpenAI({ apiKey: openAiKey }));
  }
  return undefined;
}

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

    const llm = createLlmProvider();
    const runtime: ConversationRuntime | undefined =
      llm !== undefined
        ? new AssistantConversationRuntime(repository, llm, new TruncatingContextBuilder(), clock)
        : undefined;
    container.registerValue(CONVERSATION_RUNTIME, runtime);
  }
}
