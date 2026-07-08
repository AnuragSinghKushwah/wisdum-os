import { createToken } from '@wisdum/kernel';
import type { PgPool } from '@wisdum/database';
import type { Clock, InsightRepository, OpportunityRepository } from '@wisdum/domain';
import type {
  ArchiveKnowledgeHandler,
  AssignRoleHandler,
  AttachKnowledgeContentHandler,
  AppendMessageHandler,
  AddWorkspaceMemberHandler,
  AttachWorkspaceHandler,
  AuthenticateUserHandler,
  CreateDocumentHandler,
  CreateKnowledgeHandler,
  CreateOrganizationHandler,
  CreateSearchIndexHandler,
  CreateUserHandler,
  CreateWorkspaceHandler,
  DisablePluginHandler,
  DocumentReadModel,
  EnablePluginHandler,
  GenerateContentDraftHandler,
  GetConversationHandler,
  GetContentDraftHandler,
  GetDocumentHandler,
  GetKnowledgeHandler,
  GetOpportunityHandler,
  GetOrganizationHandler,
  GetPluginHandler,
  GetPublishedContentHandler,
  GetSearchIndexHandler,
  GetUserHandler,
  GetWorkspaceHandler,
  IdGenerator,
  IndexSearchDocumentHandler,
  InstallPluginHandler,
  KnowledgeReadModel,
  ListKnowledgeHandler,
  ListOpportunitiesHandler,
  PublishContentDraftHandler,
  PublishKnowledgeHandler,
  ReplaceDocumentContentHandler,
  RunReasoningPassHandler,
  SearchIndexHandler,
  SlugGenerator,
  StartConversationHandler,
  TokenService,
  UpdateContentDraftHandler,
} from '@wisdum/application';
import type { EventBus } from '@wisdum/events';
import type { ConversationRuntime, LlmProvider } from '@wisdum/platform-ai';

/**
 * DI tokens for the API composition root. Each context registers a
 * bundle of its command/query handlers under one token; routes resolve
 * the bundle and call straight through to `handler.execute()` — no
 * business logic lives here or in the routes that use these tokens.
 */

export const CLOCK = createToken<Clock>('api.clock');
export const ID_GENERATOR = createToken<IdGenerator>('api.id-generator');
export const SLUG_GENERATOR = createToken<SlugGenerator>('api.slug-generator');
export const EVENT_BUS = createToken<EventBus>('api.event-bus');
/** Undefined when `DATABASE_URL` is not configured — modules fall back to in-memory adapters. */
export const PG_POOL = createToken<PgPool | undefined>('api.pg-pool');
export const TOKEN_SERVICE = createToken<TokenService>('api.token-service');
/** Undefined when no AI provider API key is configured — shared by AiModule and ReasoningModule. */
export const LLM_PROVIDER = createToken<LlmProvider | undefined>('api.llm-provider');
/** The model name matching whichever provider LLM_PROVIDER resolved to. Undefined together with it. */
export const LLM_MODEL = createToken<string | undefined>('api.llm-model');

export interface KnowledgeHandlers {
  readonly create: CreateKnowledgeHandler;
  readonly publish: PublishKnowledgeHandler;
  readonly archive: ArchiveKnowledgeHandler;
  readonly get: GetKnowledgeHandler;
  readonly list: ListKnowledgeHandler;
  readonly attachContent: AttachKnowledgeContentHandler;
}
export const KNOWLEDGE_HANDLERS = createToken<KnowledgeHandlers>('api.knowledge-handlers');
/** Exposed separately so ReasoningModule can read tenant knowledge without depending on KnowledgeHandlers. */
export const KNOWLEDGE_READ_MODEL = createToken<KnowledgeReadModel>('api.knowledge-read-model');

export interface DocumentHandlers {
  readonly create: CreateDocumentHandler;
  readonly replaceContent: ReplaceDocumentContentHandler;
  readonly get: GetDocumentHandler;
}
export const DOCUMENT_HANDLERS = createToken<DocumentHandlers>('api.document-handlers');
/** Exposed separately so ReasoningModule can read document content without depending on DocumentHandlers. */
export const DOCUMENT_READ_MODEL = createToken<DocumentReadModel>('api.document-read-model');

export interface IdentityHandlers {
  readonly createUser: CreateUserHandler;
  readonly assignRole: AssignRoleHandler;
  readonly getUser: GetUserHandler;
  readonly authenticate: AuthenticateUserHandler;
}
export const IDENTITY_HANDLERS = createToken<IdentityHandlers>('api.identity-handlers');

export interface WorkspaceHandlers {
  readonly create: CreateWorkspaceHandler;
  readonly addMember: AddWorkspaceMemberHandler;
  readonly get: GetWorkspaceHandler;
}
export const WORKSPACE_HANDLERS = createToken<WorkspaceHandlers>('api.workspace-handlers');

export interface OrganizationHandlers {
  readonly create: CreateOrganizationHandler;
  readonly attachWorkspace: AttachWorkspaceHandler;
  readonly get: GetOrganizationHandler;
}
export const ORGANIZATION_HANDLERS = createToken<OrganizationHandlers>('api.organization-handlers');

export interface PluginHandlers {
  readonly install: InstallPluginHandler;
  readonly enable: EnablePluginHandler;
  readonly disable: DisablePluginHandler;
  readonly get: GetPluginHandler;
}
export const PLUGIN_HANDLERS = createToken<PluginHandlers>('api.plugin-handlers');

export interface AiHandlers {
  readonly startConversation: StartConversationHandler;
  readonly appendMessage: AppendMessageHandler;
  readonly getConversation: GetConversationHandler;
}
export const AI_HANDLERS = createToken<AiHandlers>('api.ai-handlers');
/** Undefined when no AI provider API key is configured. */
export const CONVERSATION_RUNTIME = createToken<ConversationRuntime | undefined>(
  'api.conversation-runtime',
);

export interface SearchHandlers {
  readonly createIndex: CreateSearchIndexHandler;
  readonly search: SearchIndexHandler;
  readonly getIndex: GetSearchIndexHandler;
  readonly indexDocument: IndexSearchDocumentHandler;
}
export const SEARCH_HANDLERS = createToken<SearchHandlers>('api.search-handlers');

export interface OpportunityHandlers {
  readonly get: GetOpportunityHandler;
  readonly list: ListOpportunitiesHandler;
  readonly generateDraft: GenerateContentDraftHandler;
  readonly getDraft: GetContentDraftHandler;
  readonly updateDraft: UpdateContentDraftHandler;
  readonly publishDraft: PublishContentDraftHandler;
  readonly getPublished: GetPublishedContentHandler;
}
export const OPPORTUNITY_HANDLERS = createToken<OpportunityHandlers>('api.opportunity-handlers');
/**
 * Exposed separately so ReasoningModule writes through the same repository
 * instance OpportunityModule reads from — essential in in-memory mode,
 * where two independently constructed instances would silently diverge.
 */
export const OPPORTUNITY_REPOSITORY = createToken<OpportunityRepository>(
  'api.opportunity-repository',
);
export const INSIGHT_REPOSITORY = createToken<InsightRepository>('api.insight-repository');

export interface ReasoningHandlers {
  readonly run: RunReasoningPassHandler;
}
export const REASONING_HANDLERS = createToken<ReasoningHandlers>('api.reasoning-handlers');
