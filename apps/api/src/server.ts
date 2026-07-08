import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createKernel } from '@wisdum/kernel';
import type { Kernel } from '@wisdum/kernel';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import {
  AiModule,
  CoreModule,
  DocumentModule,
  IdentityModule,
  KnowledgeModule,
  OrganizationModule,
  PluginModule,
  SearchModule,
  WorkspaceModule,
} from './container/modules/index.js';
import {
  AI_HANDLERS,
  CONVERSATION_RUNTIME,
  DOCUMENT_HANDLERS,
  IDENTITY_HANDLERS,
  KNOWLEDGE_HANDLERS,
  ORGANIZATION_HANDLERS,
  PLUGIN_HANDLERS,
  SEARCH_HANDLERS,
  TOKEN_SERVICE,
  WORKSPACE_HANDLERS,
} from './container/tokens.js';
import { createAuthHook } from './middleware/auth-context.js';
import { errorHandler } from './middleware/error-handler.js';
import {
  registerAiRoutes,
  registerDocumentRoutes,
  registerIdentityRoutes,
  registerKnowledgeRoutes,
  registerOrganizationRoutes,
  registerPluginRoutes,
  registerSearchRoutes,
  registerWorkspaceRoutes,
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
    .use(new KnowledgeModule())
    .use(new DocumentModule())
    .use(new IdentityModule())
    .use(new WorkspaceModule())
    .use(new OrganizationModule())
    .use(new PluginModule())
    .use(new AiModule())
    .use(new SearchModule());
  await kernel.start();

  const app = Fastify({ logger: false });
  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', createAuthHook(kernel.container.resolve(TOKEN_SERVICE)));

  await app.register(swagger, {
    openapi: {
      info: { title: 'Wisdum API', version: '0.1.0' },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => kernel.report());

  registerKnowledgeRoutes(app, kernel.container.resolve(KNOWLEDGE_HANDLERS));
  registerDocumentRoutes(app, kernel.container.resolve(DOCUMENT_HANDLERS));
  registerIdentityRoutes(app, kernel.container.resolve(IDENTITY_HANDLERS));
  registerWorkspaceRoutes(app, kernel.container.resolve(WORKSPACE_HANDLERS));
  registerOrganizationRoutes(app, kernel.container.resolve(ORGANIZATION_HANDLERS));
  registerPluginRoutes(app, kernel.container.resolve(PLUGIN_HANDLERS));
  registerAiRoutes(app, kernel.container.resolve(AI_HANDLERS), kernel.container.resolve(CONVERSATION_RUNTIME));
  registerSearchRoutes(app, kernel.container.resolve(SEARCH_HANDLERS));

  return { app, kernel };
}
