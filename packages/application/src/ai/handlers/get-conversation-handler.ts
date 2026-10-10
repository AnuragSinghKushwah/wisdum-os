import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { ConversationDto } from '../dto/conversation-dto.js';
import type { ConversationReadModel } from '../ports/conversation-read-model.js';
import type { GetConversationQuery } from '../queries/get-conversation-query.js';

export class GetConversationHandler implements QueryHandler<GetConversationQuery, ConversationDto> {
  constructor(private readonly reads: ConversationReadModel) {}

  async execute(query: GetConversationQuery): Promise<ConversationDto> {
    const dto = await this.reads.findById(query.tenantId, query.conversationId);
    if (dto === undefined) {
      throw new NotFoundError('Conversation not found', { conversationId: query.conversationId });
    }
    return dto;
  }
}
