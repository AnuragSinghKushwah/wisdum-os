import type { TenantId } from '@wisdum/types';
import type { ConversationDto } from '../dto/conversation-dto.js';

export interface ConversationReadModel {
  /** Resolves to `undefined` for a resource that does not exist *in this tenant*. */
  findById(tenantId: TenantId, conversationId: string): Promise<ConversationDto | undefined>;
}
