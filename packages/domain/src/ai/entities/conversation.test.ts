import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { CONVERSATION_STARTED } from '../events/ai-events.js';
import { ConversationId } from '../value-objects/ai-ids.js';
import { ConversationMessage } from '../value-objects/conversation-message.js';
import { ModelReference } from '../value-objects/model-reference.js';
import { TokenUsage } from '../value-objects/token-usage.js';
import { Conversation } from './conversation.js';

const TENANT_ID = 'tenant-1' as TenantId;
const OWNER_ID = '99999999-9999-9999-9999-999999999999' as UUID;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function startConversation() {
  return Conversation.start(
    {
      id: ConversationId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      model: ModelReference.create({ provider: 'anthropic', modelName: 'claude-sonnet-5' }),
      ownerId: OWNER_ID,
    },
    clock,
  );
}

describe('Conversation', () => {
  it('starts active with no messages and raises ConversationStarted', () => {
    const conversation = startConversation();
    expect(conversation.status).toBe('active');
    expect(conversation.messageCount()).toBe(0);

    const events = conversation.pullDomainEvents();
    expect(events.some((event) => event.eventType === CONVERSATION_STARTED)).toBe(true);
  });

  it('appendMessage() accumulates token usage across turns', () => {
    const conversation = startConversation();

    conversation.appendMessage(
      ConversationMessage.create({ role: 'user', content: 'hi', createdAt: clock.now() }),
      clock,
    );
    conversation.appendMessage(
      ConversationMessage.create({
        role: 'assistant',
        content: 'hello',
        createdAt: clock.now(),
        usage: TokenUsage.create({ inputTokens: 10, outputTokens: 5 }),
      }),
      clock,
    );

    expect(conversation.messageCount()).toBe(2);
    expect(conversation.totalUsage.totalTokens).toBe(15);
  });

  it('hasPendingToolCalls() reflects any pending tool call in the transcript', () => {
    const conversation = startConversation();
    expect(conversation.hasPendingToolCalls()).toBe(false);
  });

  it('archive() prevents further messages from being appended', () => {
    const conversation = startConversation();
    conversation.archive(clock);

    expect(() =>
      conversation.appendMessage(
        ConversationMessage.create({ role: 'user', content: 'too late', createdAt: clock.now() }),
        clock,
      ),
    ).toThrow(/cannot be modified/i);
  });

  it('archive() is idempotent — archiving twice raises the event only once', () => {
    const conversation = startConversation();
    conversation.clearDomainEvents();

    conversation.archive(clock);
    conversation.archive(clock);

    expect(conversation.pullDomainEvents()).toHaveLength(1);
  });
});
