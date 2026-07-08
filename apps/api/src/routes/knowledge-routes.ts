import {
  archiveKnowledgeCommand,
  attachKnowledgeContentCommand,
  createKnowledgeCommand,
  getKnowledgeQuery,
  listKnowledgeQuery,
  publishKnowledgeCommand,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { KnowledgeHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  attachKnowledgeContentBodySchema,
  createKnowledgeBodySchema,
  knowledgeIdParamsSchema,
} from '../validation/knowledge-schemas.js';

interface CreateKnowledgeBody {
  readonly title: string;
  readonly type: string;
  readonly visibility: string;
  readonly sourceKind: string;
  readonly sourceUri?: string;
  readonly description?: string;
  readonly labels?: readonly string[];
}

interface AttachKnowledgeContentBody {
  readonly reference: string;
  readonly mimeType?: string;
}

/** Wires the Knowledge context's handlers to HTTP. No business logic — composition only. */
export function registerKnowledgeRoutes(app: FastifyInstance, handlers: KnowledgeHandlers): void {
  app.post(
    '/v1/knowledge',
    { schema: { body: createKnowledgeBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as CreateKnowledgeBody;
      const result = await handlers.create.execute(createKnowledgeCommand({ tenantId, ...body }));
      await reply.status(201).send(result);
    },
  );

  app.get('/v1/knowledge/:id', { schema: { params: knowledgeIdParamsSchema } }, async (request) => {
    const tenantId = requireTenantId(request);
    const { id } = request.params as { id: string };
    return handlers.get.execute(getKnowledgeQuery({ tenantId, knowledgeId: id }));
  });

  app.get('/v1/knowledge', async (request) => {
    const tenantId = requireTenantId(request);
    const { status } = request.query as { status?: string };
    return handlers.list.execute(listKnowledgeQuery({ tenantId, status }));
  });

  app.post(
    '/v1/knowledge/:id/publish',
    { schema: { params: knowledgeIdParamsSchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      await handlers.publish.execute(publishKnowledgeCommand({ tenantId, knowledgeId: id }));
      return { status: 'published' };
    },
  );

  app.post(
    '/v1/knowledge/:id/archive',
    { schema: { params: knowledgeIdParamsSchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      await handlers.archive.execute(archiveKnowledgeCommand({ tenantId, knowledgeId: id }));
      return { status: 'archived' };
    },
  );

  app.post(
    '/v1/knowledge/:id/content',
    { schema: { params: knowledgeIdParamsSchema, body: attachKnowledgeContentBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as AttachKnowledgeContentBody;
      await handlers.attachContent.execute(
        attachKnowledgeContentCommand({ knowledgeId: id, ...body }),
      );
      return { status: 'attached' };
    },
  );
}
