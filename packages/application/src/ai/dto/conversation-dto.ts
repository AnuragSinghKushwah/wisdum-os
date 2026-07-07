import type { Conversation } from '@wisdum/domain';

export interface ConversationMessageDto {
  readonly role: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface ConversationDto {
  readonly id: string;
  readonly model: string;
  readonly ownerId: string;
  readonly title?: string;
  readonly status: string;
  readonly messages: readonly ConversationMessageDto[];
  readonly totalTokens: number;
  readonly createdAt: string;
}

export function toConversationDto(conversation: Conversation): ConversationDto {
  return {
    id: conversation.getId().value(),
    model: conversation.model.toString(),
    ownerId: conversation.ownerId,
    title: conversation.title,
    status: conversation.status,
    messages: conversation.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    totalTokens: conversation.totalUsage.totalTokens,
    createdAt: conversation.createdAt,
  };
}
