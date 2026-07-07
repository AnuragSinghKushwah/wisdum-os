import type { ConversationDto } from '../dto/conversation-dto.js';

export interface ConversationReadModel {
  findById(conversationId: string): Promise<ConversationDto | undefined>;
}
