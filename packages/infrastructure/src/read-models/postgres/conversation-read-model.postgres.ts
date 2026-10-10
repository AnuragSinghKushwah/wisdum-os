import type { TenantId } from '@wisdum/types';
import { ConversationId } from '@wisdum/domain';
import type { ConversationDto, ConversationReadModel } from '@wisdum/application';
import { toConversationDto } from '@wisdum/application';
import type { PostgresConversationRepository } from '../../persistence/postgres/conversation-repository.postgres.js';

export class PostgresConversationReadModel implements ConversationReadModel {
  constructor(private readonly repository: PostgresConversationRepository) {}

  async findById(tenantId: TenantId, conversationId: string): Promise<ConversationDto | undefined> {
    const found = await this.repository.findById(ConversationId.create(conversationId));
    return found.some && found.value.tenantId === tenantId
      ? toConversationDto(found.value)
      : undefined;
  }
}
