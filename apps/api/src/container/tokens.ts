import { createToken } from '@wisdum/kernel';
import type { PgPool } from '@wisdum/database';
import type { Clock } from '@wisdum/domain';
import type {
  ArchiveKnowledgeHandler,
  AssignRoleHandler,
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
  EnablePluginHandler,
  GetConversationHandler,
  GetDocumentHandler,
  GetKnowledgeHandler,
  GetOrganizationHandler,
  GetPluginHandler,
  GetSearchIndexHandler,
  GetUserHandler,
  GetWorkspaceHandler,
  IdGenerator,
  IndexSearchDocumentHandler,
  InstallPluginHandler,
  ListKnowledgeHandler,
  PublishKnowledgeHandler,
  ReplaceDocumentContentHandler,
  SearchIndexHandler,
  SlugGenerator,
  StartConversationHandler,
  TokenService,
} from '@wisdum/application';
import type { EventBus } from '@wisdum/events';
import type { ConversationRuntime } from '@wisdum/platform-ai';

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

export interface KnowledgeHandlers {
  readonly create: CreateKnowledgeHandler;
  readonly publish: PublishKnowledgeHandler;
  readonly archive: ArchiveKnowledgeHandler;
  readonly get: GetKnowledgeHandler;
  readonly list: ListKnowledgeHandler;
}
export const KNOWLEDGE_HANDLERS = createToken<KnowledgeHandlers>('api.knowledge-handlers');

export interface DocumentHandlers {
  readonly create: CreateDocumentHandler;
  readonly replaceContent: ReplaceDocumentContentHandler;
  readonly get: GetDocumentHandler;
}
export const DOCUMENT_HANDLERS = createToken<DocumentHandlers>('api.document-handlers');

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
