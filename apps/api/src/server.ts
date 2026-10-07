import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
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
import { createAuthHook } from './middleware/auth-context.js';
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
  registerGraphRoutes,
  registerWebhookRoutes,
  registerEventStreamRoutes,
  registerHealthRoutes,
} from './routes/index.js';



/**
 * Composes the kernel (every bounded context's module) and the Fastify
 * app on top of it. Pure composition — no business logic lives here or
 * anywhere else in `apps/api`.
 */
export async function buildServer(): Promise<{ app: FastifyInstance; kernel: Kernel }> {
  const kernel = createKernel();
  kernel
    .use(new CoreModule())
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

  const app = Fastify({ logger: true });

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
  app.addHook('onRequest', createAuthHook(kernel.container.resolve(TOKEN_SERVICE)));

  await app.register(swagger, {
    openapi: {
      info: { title: 'Wisdum API', version: '0.1.0' },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => kernel.report());

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
  registerIdentityRoutes(
    app,
    kernel.container.resolve(IDENTITY_HANDLERS),
    kernel.container.resolve(PG_POOL),
    kernel.container.resolve(TOKEN_SERVICE),
    kernel.container.resolve(ID_GENERATOR),
    kernel.container.resolve(CLOCK),
  );
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
  registerGraphRoutes(app, kernel.container.resolve(GRAPH_HANDLERS));
  registerWebhookRoutes(app, kernel.container.resolve(CAPTURE_HANDLERS));
  registerEventStreamRoutes(app, kernel.container.resolve(EVENT_BUS));
  registerHealthRoutes(app);

  return { app, kernel };
}


