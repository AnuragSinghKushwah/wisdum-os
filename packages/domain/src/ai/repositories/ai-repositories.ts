import type { Option, TenantId, UUID } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { AIModelKind } from '../types/ai-types.js';
import type { AIModel } from '../entities/ai-model.js';
import type { AIProvider } from '../entities/ai-provider.js';
import type { Conversation } from '../entities/conversation.js';
import type { PromptTemplate } from '../entities/prompt-template.js';
import type {
  AIModelId,
  AIProviderId,
  ConversationId,
  PromptTemplateId,
} from '../value-objects/ai-ids.js';
import type { ModelReference } from '../value-objects/model-reference.js';
import type { ProviderName } from '../value-objects/provider-name.js';

/**
 * Persistence ports of the AI bounded context. Interfaces only —
 * implementations live outside the domain (ADR 0007).
 */

export interface AIProviderRepository extends Repository<AIProvider> {
  findById(id: AIProviderId): Promise<Option<AIProvider>>;
  findByName(tenantId: TenantId, name: ProviderName): Promise<Option<AIProvider>>;
  findAll(tenantId: TenantId): Promise<readonly AIProvider[]>;
  save(provider: AIProvider): Promise<void>;
  delete(provider: AIProvider): Promise<void>;
}

export interface AIModelRepository extends Repository<AIModel> {
  findById(id: AIModelId): Promise<Option<AIModel>>;
  findByReference(tenantId: TenantId, reference: ModelReference): Promise<Option<AIModel>>;
  findByKind(tenantId: TenantId, kind: AIModelKind): Promise<readonly AIModel[]>;
  save(model: AIModel): Promise<void>;
  delete(model: AIModel): Promise<void>;
}

export interface PromptTemplateRepository extends Repository<PromptTemplate> {
  findById(id: PromptTemplateId): Promise<Option<PromptTemplate>>;
  /** Template names are unique per tenant. */
  findByName(tenantId: TenantId, name: string): Promise<Option<PromptTemplate>>;
  findAll(tenantId: TenantId): Promise<readonly PromptTemplate[]>;
  save(template: PromptTemplate): Promise<void>;
  delete(template: PromptTemplate): Promise<void>;
}

export interface ConversationRepository extends Repository<Conversation> {
  findById(id: ConversationId): Promise<Option<Conversation>>;
  findByOwner(tenantId: TenantId, ownerId: UUID): Promise<readonly Conversation[]>;
  save(conversation: Conversation): Promise<void>;
  delete(conversation: Conversation): Promise<void>;
}
