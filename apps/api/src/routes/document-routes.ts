import {
  createDocumentCommand,
  getDocumentQuery,
  replaceDocumentContentCommand,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { DocumentHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  createDocumentBodySchema,
  documentIdParamsSchema,
  replaceDocumentContentBodySchema,
} from '../validation/document-schemas.js';

interface CreateDocumentBody {
  readonly content: string;
  readonly mimeType: string;
  readonly encoding: string;
  readonly language?: string;
}

interface ReplaceDocumentContentBody {
  readonly content: string;
  readonly encoding: string;
}

export function registerDocumentRoutes(app: FastifyInstance, handlers: DocumentHandlers): void {
  app.post(
    '/v1/documents',
    { schema: { body: createDocumentBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as CreateDocumentBody;
      const result = await handlers.create.execute(createDocumentCommand({ tenantId, ...body }));
      await reply.status(201).send(result);
    },
  );

  app.get('/v1/documents/:id', { schema: { params: documentIdParamsSchema } }, async (request) => {
    const { id } = request.params as { id: string };
    return handlers.get.execute(getDocumentQuery({ documentId: id }));
  });

  app.put(
    '/v1/documents/:id/content',
    { schema: { params: documentIdParamsSchema, body: replaceDocumentContentBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as ReplaceDocumentContentBody;
      await handlers.replaceContent.execute(
        replaceDocumentContentCommand({ documentId: id, ...body }),
      );
      return { status: 'updated' };
    },
  );
}
