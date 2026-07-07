import type {
  AIModel,
  AIModelId,
  AIModelKind,
  AIModelRepository,
  AIProvider,
  AIProviderId,
  AIProviderRepository,
  Conversation,
  ConversationId,
  ConversationRepository,
  ModelReference,
  PromptTemplate,
  PromptTemplateId,
  PromptTemplateRepository,
  ProviderName,
} from '@wisdum/domain';
import type { Option, TenantId, UUID } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryAIProviderRepository
  extends InMemoryRepository<AIProviderId, AIProvider>
  implements AIProviderRepository
{
  findByName(tenantId: TenantId, name: ProviderName): Promise<Option<AIProvider>> {
    const found = this.values().find(
      (provider) => provider.tenantId === tenantId && provider.name.equals(name),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findAll(tenantId: TenantId): Promise<readonly AIProvider[]> {
    return Promise.resolve(this.values().filter((provider) => provider.tenantId === tenantId));
  }
}

export class InMemoryAIModelRepository
  extends InMemoryRepository<AIModelId, AIModel>
  implements AIModelRepository
{
  findByReference(tenantId: TenantId, reference: ModelReference): Promise<Option<AIModel>> {
    const found = this.values().find(
      (model) => model.tenantId === tenantId && model.reference.equals(reference),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findByKind(tenantId: TenantId, kind: AIModelKind): Promise<readonly AIModel[]> {
    return Promise.resolve(
      this.values().filter((model) => model.tenantId === tenantId && model.kind === kind),
    );
  }
}

export class InMemoryPromptTemplateRepository
  extends InMemoryRepository<PromptTemplateId, PromptTemplate>
  implements PromptTemplateRepository
{
  findByName(tenantId: TenantId, name: string): Promise<Option<PromptTemplate>> {
    const found = this.values().find(
      (template) => template.tenantId === tenantId && template.name === name,
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findAll(tenantId: TenantId): Promise<readonly PromptTemplate[]> {
    return Promise.resolve(this.values().filter((template) => template.tenantId === tenantId));
  }
}

export class InMemoryConversationRepository
  extends InMemoryRepository<ConversationId, Conversation>
  implements ConversationRepository
{
  findByOwner(tenantId: TenantId, ownerId: UUID): Promise<readonly Conversation[]> {
    return Promise.resolve(
      this.values().filter(
        (conversation) => conversation.tenantId === tenantId && conversation.ownerId === ownerId,
      ),
    );
  }
}
