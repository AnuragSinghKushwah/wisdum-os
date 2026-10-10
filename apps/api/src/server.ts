import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { optionalEnv } from '@wisdum/config';
import { createLogger } from '@wisdum/logger';
import { createKernel } from '@wisdum/kernel';
import type { Kernel } from '@wisdum/kernel';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import {
  AiModule,
  CoreModule,
  DocumentModule,
  GithubModule,
  IdentityModule,
  KnowledgeModule,
  NotionModule,
  ObsidianModule,
  OpportunityModule,
  OrganizationModule,
  PluginModule,
  ReasoningModule,
  SchedulerModule,
  SearchModule,
  SlackModule,
  WorkspaceModule,
  AiExportModule,
  EmailModule,
  AgentModule,
  GraphModule,
  CaptureModule,
} from './container/modules/index.js';
import {
  AI_HANDLERS,
  CONVERSATION_RUNTIME,
  DOCUMENT_HANDLERS,
  IDENTITY_HANDLERS,
  KNOWLEDGE_HANDLERS,
  OPPORTUNITY_HANDLERS,
  OPPORTUNITY_REPOSITORY,
  INSIGHT_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
  ORGANIZATION_HANDLERS,
  PLUGIN_HANDLERS,
  REASONING_HANDLERS,
  SEARCH_HANDLERS,
  AGENT_HANDLERS,
  ACCESS_POLICY,
  TOKEN_SERVICE,
  WORKSPACE_HANDLERS,
  VECTOR_STORE,
  EMBEDDING_PROVIDER,
  EMBEDDING_MODEL,
  PG_POOL,
  KNOWLEDGE_READ_MODEL,
  GRAPH_HANDLERS,
  CAPTURE_HANDLERS,
  EVENT_BUS,
} from './container/tokens.js';
import type { LlmSelection } from './container/modules/core-module.js';
import { seedDevelopmentData } from './bootstrap/dev-seed.js';
import { createSignupPolicy } from './bootstrap/signup-policy.js';
import { resolveRuntimeEnvironment } from './config/runtime-environment.js';
import { createAuthHook } from './middleware/auth-context.js';
import { createRoutePolicy } from './security/route-permissions.js';
import { errorHandler } from './middleware/error-handler.js';
import {
  registerAiRoutes,
  registerDocumentRoutes,
  registerIdentityRoutes,
  registerKnowledgeRoutes,
  registerOpportunityRoutes,
  registerOrganizationRoutes,
  registerPluginRoutes,
  registerReasoningRoutes,
  registerSearchRoutes,
  registerWorkspaceRoutes,
  registerAgentRoutes,
  registerGraphRoutes,
  registerWebhookRoutes,
  registerEventStreamRoutes,
  registerHealthRoutes,
} from './routes/index.js';



/** A route as registered with Fastify, recorded so security policy can be checked against it. */
export interface RegisteredRoute {
  readonly method: string;
  readonly url: string;
  readonly public: boolean;
}

/**
 * Composes the kernel (every bounded context's module) and the Fastify
 * app on top of it. Pure composition — no business logic lives here or
 * anywhere else in `apps/api`.
 */
export async function buildServer(options: { readonly llm?: LlmSelection } = {}): Promise<{
  app: FastifyInstance;
  kernel: Kernel;
  routes: readonly RegisteredRoute[];
}> {
  const kernel = createKernel();
  kernel
    .use(new CoreModule(options.llm === undefined ? {} : { llm: options.llm }))
    .use(new DocumentModule())
    .use(new KnowledgeModule())
    .use(new IdentityModule())
    .use(new WorkspaceModule())
    .use(new OrganizationModule())
    .use(new PluginModule())
    .use(new AiModule())
    .use(new SearchModule())
    .use(new OpportunityModule())
    .use(new ReasoningModule())
    .use(new SchedulerModule())
    .use(new GithubModule())
    .use(new NotionModule())
    .use(new SlackModule())
    .use(new ObsidianModule())
    .use(new AiExportModule())
    .use(new EmailModule())
    .use(new AgentModule())
    .use(new GraphModule())
    .use(new CaptureModule());
  await kernel.start();

  const identityHandlers = kernel.container.resolve(IDENTITY_HANDLERS);
  const pool = kernel.container.resolve(PG_POOL);
  const ids = kernel.container.resolve(ID_GENERATOR);
  const clock = kernel.container.resolve(CLOCK);
  const access = kernel.container.resolve(ACCESS_POLICY);

  const signupPolicy = createSignupPolicy({
    allowOpenSignup: optionalEnv('WISDUM_ALLOW_SIGNUP', 'false') === 'true',
    pool,
  });

  if (optionalEnv('WISDUM_DEV_SEED', 'false') === 'true') {
    await seedDevelopmentData({
      environment: resolveRuntimeEnvironment(),
      handlers: identityHandlers,
      ids,
      clock,
      access,
      pool,
    });
    signupPolicy.recordTenantCreated();
    createLogger('api').warn(
      'Development seed enabled: a development account exists. Never enable WISDUM_DEV_SEED on a reachable deployment.',
    );
  }

  const app = Fastify({ logger: true });

  const routes: RegisteredRoute[] = [];
  app.addHook('onRoute', (route) => {
    for (const method of Array.isArray(route.method) ? route.method : [route.method]) {
      routes.push({ method, url: route.url, public: route.config?.public === true });
    }
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-api-key', 'Accept'],
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });
  app.setErrorHandler(errorHandler);
  app.addHook(
    'onRequest',
    createAuthHook({
      tokens: kernel.container.resolve(TOKEN_SERVICE),
      apiKeys: identityHandlers.authenticateApiKey,
      access,
      routePolicy: createRoutePolicy(),
    }),
  );

  await app.register(swagger, {
    openapi: {
      info: { title: 'Wisdum API', version: '0.1.0' },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', { config: { public: true } }, async () => kernel.report());

  registerKnowledgeRoutes(
    app,
    kernel.container.resolve(KNOWLEDGE_HANDLERS),
    kernel.container.resolve(DOCUMENT_HANDLERS),
  );
  registerDocumentRoutes(app, kernel.container.resolve(DOCUMENT_HANDLERS));
  registerSearchRoutes(
    app,
    kernel.container.resolve(SEARCH_HANDLERS),
    kernel.container.resolve(PG_POOL),
    kernel.container.resolve(VECTOR_STORE),
    kernel.container.resolve(EMBEDDING_PROVIDER),
    kernel.container.resolve(EMBEDDING_MODEL),
    kernel.container.resolve(KNOWLEDGE_HANDLERS),
  );
  registerIdentityRoutes(app, {
    handlers: identityHandlers,
    tokens: kernel.container.resolve(TOKEN_SERVICE),
    ids,
    clock,
    access,
    signupPolicy,
    pool,
  });
  registerWorkspaceRoutes(app, kernel.container.resolve(WORKSPACE_HANDLERS));
  registerOrganizationRoutes(app, kernel.container.resolve(ORGANIZATION_HANDLERS));
  registerPluginRoutes(app, kernel.container.resolve(PLUGIN_HANDLERS));
  registerAiRoutes(app, kernel.container.resolve(AI_HANDLERS), kernel.container.resolve(CONVERSATION_RUNTIME));
  registerOpportunityRoutes(
    app,
    kernel.container.resolve(OPPORTUNITY_HANDLERS),
    kernel.container.resolve(OPPORTUNITY_REPOSITORY),
    kernel.container.resolve(INSIGHT_REPOSITORY),
    kernel.container.resolve(KNOWLEDGE_READ_MODEL),
  );
  registerReasoningRoutes(
    app,
    kernel.container.resolve(REASONING_HANDLERS),
  );
  registerAgentRoutes(app, kernel.container.resolve(AGENT_HANDLERS));
  registerGraphRoutes(app, kernel.container.resolve(GRAPH_HANDLERS));
  registerWebhookRoutes(app, kernel.container.resolve(CAPTURE_HANDLERS));
  registerEventStreamRoutes(app, kernel.container.resolve(EVENT_BUS));
  registerHealthRoutes(app);

  return { app, kernel, routes };
}


