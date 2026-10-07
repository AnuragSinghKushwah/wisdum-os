import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { some, none } from '@wisdum/types';
import { ConversationId } from '@wisdum/domain';
import type { ConversationRepository, Clock, Conversation } from '@wisdum/domain';
import { startConversationCommand } from '../../commands/start-conversation-command.js';
import { appendMessageCommand } from '../../commands/append-message-command.js';
import { getConversationQuery } from '../../queries/get-conversation-query.js';
import { StartConversationHandler } from '../start-conversation-handler.js';
import { AppendMessageHandler } from '../append-message-handler.js';
import { GetConversationHandler } from '../get-conversation-handler.js';
import type { ConversationReadModel } from '../../ports/conversation-read-model.js';
import type { ConversationDto } from '../../dto/conversation-dto.js';
import type { DomainEventPublisher } from '../../../shared/ports.js';

class FakeConversationRepository implements ConversationRepository {
  public items = new Map<string, Conversation>();

  async save(conversation: Conversation): Promise<void> {
    this.items.set(conversation.getId().value(), conversation);
  }

  async findById(id: ConversationId): Promise<Option<Conversation>> {
    const item = this.items.get(id.value());
    return item ? some(item) : none;
  }

  async findByOwner(): Promise<readonly Conversation[]> {
    return [];
  }
  async delete(): Promise<void> {}
  async listByTenant(): Promise<readonly Conversation[]> {
    return [];
  }
}

class FakeConversationReadModel implements ConversationReadModel {
  constructor(private repo: FakeConversationRepository) {}

  async findById(id: string): Promise<ConversationDto | undefined> {
    const opt = await this.repo.findById(ConversationId.create(id));
    if (!opt.some) return undefined;
    const item = (opt as { value: Conversation }).value;
    return {
      id: item.getId().value(),
      title: item.title ?? 'Untitled',
      model: `${item.model.provider}:${item.model.modelName}`,
      ownerId: item.ownerId,
      status: 'active',
      totalTokens: 0,
      messages: item.messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      createdAt: item.createdAt,
    };
  }

  async listByTenant(): Promise<readonly ConversationDto[]> {
    return [];
  }
}

const mockClock: Clock = {
  now: () => '2026-07-27T12:00:00.000Z' as IsoTimestamp,
};

const mockIdGenerator = {
  nextId: () => '00000000-0000-4000-8000-000000000001' as UUID,
};

const mockEvents: DomainEventPublisher = {
  publishAll: async () => {},
};

describe('AI Conversation Handlers', () => {
  it('StartConversationHandler creates and persists new conversation', async () => {
    const repo = new FakeConversationRepository();
    const handler = new StartConversationHandler(repo, mockIdGenerator, mockEvents, mockClock);

    const result = await handler.execute(
      startConversationCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        provider: 'openai',
        modelName: 'gpt-4o',
        ownerId: '00000000-0000-4000-8000-000000000002',
        title: 'Wisdum AI Assistant',
      }),
    );

    expect(result.conversationId).toBe('00000000-0000-4000-8000-000000000001');
    expect(repo.items.size).toBe(1);
    const conv = repo.items.get(result.conversationId);
    expect(conv?.title).toBe('Wisdum AI Assistant');
  });

  it('AppendMessageHandler appends a message to an existing conversation', async () => {
    const repo = new FakeConversationRepository();
    const startHandler = new StartConversationHandler(repo, mockIdGenerator, mockEvents, mockClock);
    const appendHandler = new AppendMessageHandler(repo, mockEvents, mockClock);

    const { conversationId } = await startHandler.execute(
      startConversationCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        provider: 'openai',
        modelName: 'gpt-4o',
        ownerId: '00000000-0000-4000-8000-000000000002',
        title: 'Chat Session',
      }),
    );

    await appendHandler.execute(
      appendMessageCommand({
        conversationId,
        role: 'user',
        content: 'Summarize my recent knowledge assets',
      }),
    );

    const conv = repo.items.get(conversationId);
    expect(conv?.messages.length).toBe(1);
    expect(conv?.messages[0]?.content).toBe('Summarize my recent knowledge assets');
  });

  it('GetConversationHandler retrieves conversation DTO', async () => {
    const repo = new FakeConversationRepository();
    const readModel = new FakeConversationReadModel(repo);
    const startHandler = new StartConversationHandler(repo, mockIdGenerator, mockEvents, mockClock);
    const getHandler = new GetConversationHandler(readModel);

    const { conversationId } = await startHandler.execute(
      startConversationCommand({
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        provider: 'openai',
        modelName: 'gpt-4o',
        ownerId: '00000000-0000-4000-8000-000000000002',
        title: 'Retrievable Conversation',
      }),
    );

    const dto = await getHandler.execute(
      getConversationQuery({
        conversationId,
      }),
    );

    expect(dto).not.toBeUndefined();
    expect(dto?.title).toBe('Retrievable Conversation');
  });
});
