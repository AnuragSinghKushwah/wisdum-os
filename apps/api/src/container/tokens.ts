import type { AiCheck } from './ai-check.js';
import { createToken } from '@wisdum/kernel';
import type { CapabilityRegistry } from '@wisdum/kernel';
import type { PgPool } from '@wisdum/database';
import type {
  Clock,
  InsightRepository,
  OpportunityRepository,
  PluginRepository,
  PublishedContentRepository,
  DocumentRepository,
  ConceptRepository,
  ConceptRelationshipRepository,
  AgentTaskRepository,
} from '@wisdum/domain';
import type {
  UpdateKnowledgeHandler,
  DeleteKnowledgeHandler,
  ChangeKnowledgeVisibilityHandler,
  ImportKnowledgeHandler,
  ArchiveKnowledgeHandler,
  AssignRoleHandler,
  AttachKnowledgeContentHandler,
  AppendMessageHandler,
  AddWorkspaceMemberHandler,
  AttachWorkspaceHandler,
  AccessPolicy,
  AuthenticateApiKeyHandler,
  AuthenticateUserHandler,
  CreateDocumentHandler,
  CreateKnowledgeHandler,
  CreateOrganizationHandler,
  CreateSearchIndexHandler,
  CreateUserHandler,
  CreateWorkspaceHandler,
  CreateApiKeyHandler,
  CreateOpportunityHandler,
  DismissOpportunityHandler,
  RevokeApiKeyHandler,
  ListApiKeysHandler,
  ApiKeyReadModel,
  DisablePluginHandler,
  DocumentReadModel,
  EnablePluginHandler,
  GenerateContentDraftHandler,
  GenerateContentFromKnowledgeHandler,
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
  ListContentDraftsHandler,
  ListKnowledgeHandler,
  ListOpportunitiesHandler,
  ListPluginsHandler,
  ListPublishedContentHandler,
  ListWorkspacesHandler,
  PublishContentDraftHandler,
  PublishKnowledgeHandler,
  ReplaceDocumentContentHandler,
  RunReasoningPassHandler,
  SearchIndexHandler,
  SlugGenerator,
  StartConversationHandler,
  TokenService,
  UpdateContentDraftHandler,
  UpdateWorkspaceSettingsHandler,
  CreateAgentTaskHandler,
  ExecuteAgentTaskHandler,
  ListAgentTasksHandler,
  GetGraphTopologyHandler,
  GetGraphNeighborsHandler,
  GraphReadModel,
  IngestWebhookHandler,
  OrganizationReadModel,
  UserReadModel,
  WorkspaceReadModel,
} from '@wisdum/application';
import type { EventBus } from '@wisdum/events';
import type { ConversationRuntime, LlmProvider, EmbeddingProvider } from '@wisdum/platform-ai';
import type { InputConnector } from '@wisdum/platform-inputs';
import type { Scheduler } from '@wisdum/platform-jobs';
import type { PublishingProvider } from '@wisdum/platform-publishing';
import type { EmbeddingPipeline, VectorStore } from '@wisdum/platform-search';

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

/** Whether a real model backs content generation, for the capabilities endpoint and UI banner. */
export type LlmStatus =
  | {
      readonly mode: 'live';
      readonly provider: string;
      readonly model: string;
      /** Updated in place when the start-up check finishes. */
      check: AiCheck;
    }
  | { readonly mode: 'mock' };
export const LLM_STATUS = createToken<LlmStatus>('api.llm-status');
/** Undefined when EMBEDDING_ENABLED=false — otherwise always set (OpenAI or a local fallback). */
export const EMBEDDING_PIPELINE = createToken<EmbeddingPipeline | undefined>(
  'api.embedding-pipeline',
);
/** The model name matching whichever provider EMBEDDING_PIPELINE resolved to. */
export const EMBEDDING_MODEL = createToken<string | undefined>('api.embedding-model');
export const EMBEDDING_PROVIDER = createToken<EmbeddingProvider | undefined>('api.embedding-provider');
export const VECTOR_STORE = createToken<VectorStore | undefined>('api.vector-store');

export interface KnowledgeHandlers {
  readonly create: CreateKnowledgeHandler;
  readonly update: UpdateKnowledgeHandler;
  readonly delete: DeleteKnowledgeHandler;
  readonly changeVisibility: ChangeKnowledgeVisibilityHandler;
  readonly import: ImportKnowledgeHandler;
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
export const DOCUMENT_REPOSITORY = createToken<DocumentRepository>('api.document-repository');

export interface IdentityHandlers {
  readonly createUser: CreateUserHandler;
  readonly assignRole: AssignRoleHandler;
  readonly getUser: GetUserHandler;
  readonly authenticate: AuthenticateUserHandler;
  readonly authenticateApiKey: AuthenticateApiKeyHandler;
  readonly createApiKey: CreateApiKeyHandler;
  readonly revokeApiKey: RevokeApiKeyHandler;
  readonly listApiKeys: ListApiKeysHandler;
}
export const IDENTITY_HANDLERS = createToken<IdentityHandlers>('api.identity-handlers');
export const API_KEY_READ_MODEL = createToken<ApiKeyReadModel>('api.api-key-read-model');
export const ACCESS_POLICY = createToken<AccessPolicy>('api.access-policy');
export const USER_READ_MODEL = createToken<UserReadModel>('api.user-read-model');
export const ORGANIZATION_READ_MODEL = createToken<OrganizationReadModel>('api.organization-read-model');
export const WORKSPACE_READ_MODEL = createToken<WorkspaceReadModel>('api.workspace-read-model');

export interface WorkspaceHandlers {
  readonly create: CreateWorkspaceHandler;
  readonly addMember: AddWorkspaceMemberHandler;
  readonly get: GetWorkspaceHandler;
  readonly list: ListWorkspacesHandler;
  readonly updateSettings: UpdateWorkspaceSettingsHandler;
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
  readonly list: ListPluginsHandler;
}
export const PLUGIN_HANDLERS = createToken<PluginHandlers>('api.plugin-handlers');
/** Exposed separately so OpportunityModule's CapabilityPluginProvisioner writes through the same repository PluginModule reads from. */
export const PLUGIN_REPOSITORY = createToken<PluginRepository>('api.plugin-repository');
/** First-party publishing providers, keyed by capability string (e.g. `publishing.website`). */
export const PUBLISHING_PROVIDERS = createToken<CapabilityRegistry<PublishingProvider>>(
  'api.publishing-providers',
);

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
  readonly create: CreateOpportunityHandler;
  readonly dismiss: DismissOpportunityHandler;
  readonly get: GetOpportunityHandler;
  readonly list: ListOpportunitiesHandler;
  readonly generateDraft: GenerateContentDraftHandler;
  readonly generateFromKnowledge: GenerateContentFromKnowledgeHandler;
  readonly getDraft: GetContentDraftHandler;
  readonly listDrafts: ListContentDraftsHandler;
  readonly updateDraft: UpdateContentDraftHandler;
  readonly publishDraft: PublishContentDraftHandler;
  readonly getPublished: GetPublishedContentHandler;
  readonly listPublished: ListPublishedContentHandler;
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
export const PUBLISHED_CONTENT_REPOSITORY = createToken<PublishedContentRepository>(
  'api.published-content-repository',
);
export const CONCEPT_REPOSITORY = createToken<ConceptRepository>('api.concept-repository');
export const CONCEPT_RELATIONSHIP_REPOSITORY = createToken<ConceptRelationshipRepository>(
  'api.concept-relationship-repository',
);

export interface ReasoningHandlers {
  readonly run: RunReasoningPassHandler;
}
export const REASONING_HANDLERS = createToken<ReasoningHandlers>('api.reasoning-handlers');

/** The in-process job scheduler. Exposed for observability/testability; disabled by default (see SchedulerModule). */
export const SCHEDULER = createToken<Scheduler>('api.scheduler');

/** First-party input connectors, keyed by capability string (e.g. `input.github-readme`). Only registered when configured (see GithubModule). */
export const INPUT_CONNECTORS = createToken<CapabilityRegistry<InputConnector>>(
  'api.input-connectors',
);

export interface AgentHandlers {
  readonly create: CreateAgentTaskHandler;
  readonly execute: ExecuteAgentTaskHandler;
  readonly list: ListAgentTasksHandler;
}
export const AGENT_HANDLERS = createToken<AgentHandlers>('api.agent-handlers');
export const AGENT_TASK_REPOSITORY = createToken<AgentTaskRepository>('api.agent-task-repository');

export interface GraphHandlers {
  readonly getTopology: GetGraphTopologyHandler;
  readonly getNeighbors: GetGraphNeighborsHandler;
}
export const GRAPH_HANDLERS = createToken<GraphHandlers>('api.graph-handlers');
export const GRAPH_READ_MODEL = createToken<GraphReadModel>('api.graph-read-model');

export interface CaptureHandlers {
  readonly ingestWebhook: IngestWebhookHandler;
}
export const CAPTURE_HANDLERS = createToken<CaptureHandlers>('api.capture-handlers');

