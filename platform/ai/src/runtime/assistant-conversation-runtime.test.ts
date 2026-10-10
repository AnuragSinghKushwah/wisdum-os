import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { Conversation, ConversationId, ModelReference } from '@wisdum/domain';
import type { Clock, ConversationRepository } from '@wisdum/domain';
import type { ContextBuilder } from '../context/context-builder.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import { AssistantConversationRuntime } from './assistant-conversation-runtime.js';

const OWNER_TENANT = '11111111-1111-4111-8111-111111111111' as TenantId;
const OTHER_TENANT = '99999999-9999-4999-8999-999999999999';
const CONVERSATION_ID = '22222222-2222-4222-8222-222222222222';
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function setup() {
  const conversation = Conversation.start(
    {
      id: ConversationId.create(CONVERSATION_ID),
      tenantId: OWNER_TENANT,
      model: ModelReference.create({ provider: 'anthropic', modelName: 'test-model' }),
      ownerId: '33333333-3333-4333-8333-333333333333' as UUID,
    },
    clock,
  );
  const repository: ConversationRepository = {
    findById: (id): Promise<Option<Conversation>> =>
      Promise.resolve(
        id.value() === CONVERSATION_ID ? { some: true, value: conversation } : { some: false },
      ),
    findByOwner: () => Promise.resolve([]),
    save: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
  const llmCalls: unknown[] = [];
  // These tests must never reach the model, so any call is recorded and fails loudly.
  const llm = {
    complete: (request: unknown): Promise<never> => {
      llmCalls.push(request);
      return Promise.reject(new Error('the model must not be called'));
    },
  } as unknown as LlmProvider;
  const contextBuilder = { build: () => [] } as unknown as ContextBuilder;
  return {
    conversation,
    llmCalls,
    runtime: new AssistantConversationRuntime(repository, llm, contextBuilder, clock),
  };
}

describe('AssistantConversationRuntime tenant isolation', () => {
  it("treats another tenant's conversation as missing, without calling the model or changing it", async () => {
    const { runtime, conversation, llmCalls } = setup();

    await expect(
      runtime.runTurn({
        tenantId: OTHER_TENANT,
        conversationId: CONVERSATION_ID,
        userMessage: 'hi',
      }),
    ).rejects.toMatchObject({ code: 'not_found', message: 'Conversation not found' });

    expect(llmCalls).toEqual([]);
    expect(conversation.messages).toHaveLength(0);
  });

  it('reports a conversation that does not exist with the same error', async () => {
    const { runtime } = setup();
    await expect(
      runtime.runTurn({
        tenantId: OWNER_TENANT,
        conversationId: '44444444-4444-4444-8444-444444444444',
        userMessage: 'hi',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
