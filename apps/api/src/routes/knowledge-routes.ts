import {
  archiveKnowledgeCommand,
  attachKnowledgeContentCommand,
  changeKnowledgeVisibilityCommand,
  createKnowledgeCommand,
  createDocumentCommand,
  deleteKnowledgeCommand,
  getKnowledgeQuery,
  importKnowledgeCommand,
  listKnowledgeQuery,
  publishKnowledgeCommand,
  updateKnowledgeCommand,
  AuthenticationError,
} from '@wisdum/application';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { KnowledgeHandlers, DocumentHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  attachKnowledgeContentBodySchema,
  changeKnowledgeVisibilityBodySchema,
  createKnowledgeBodySchema,
  createWebhookKnowledgeBodySchema,
  importKnowledgeBodySchema,
  knowledgeIdParamsSchema,
  updateKnowledgeBodySchema,
} from '../validation/knowledge-schemas.js';
import { optionalEnv } from '@wisdum/config';

interface CreateKnowledgeBody {
  readonly title: string;
  readonly type: string;
  readonly visibility: string;
  readonly sourceKind: string;
  readonly sourceUri?: string;
  readonly description?: string;
  readonly labels?: readonly string[];
}

interface UpdateKnowledgeBody {
  readonly title?: string;
  readonly description?: string;
  readonly labels?: readonly string[];
}

interface ChangeKnowledgeVisibilityBody {
  readonly visibility: 'private' | 'workspace' | 'public';
}

interface ImportKnowledgeBody {
  readonly sourceKind: string;
  readonly sourceUri?: string;
}

interface AttachKnowledgeContentBody {
  readonly reference: string;
  readonly mimeType?: string;
}

interface CreateWebhookKnowledgeBody {
  readonly title: string;
  readonly type: string;
  readonly content?: string;
  readonly visibility?: string;
  readonly description?: string;
  readonly labels?: readonly string[];
}

function verifyWebhookAuth(request: FastifyRequest): void {
  const expectedApiKey = optionalEnv('WISDUM_API_KEY', 'dev-webhook-key');
  const headerKey = request.headers['x-api-key'];
  const actualKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
  if (actualKey === undefined || actualKey !== expectedApiKey) {
    throw new AuthenticationError('Invalid or missing x-api-key header');
  }
}

/** Wires the Knowledge context's handlers to HTTP. No business logic — composition only. */
export function registerKnowledgeRoutes(
  app: FastifyInstance,
  handlers: KnowledgeHandlers,
  documentHandlers?: DocumentHandlers,
): void {
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

  app.patch(
    '/v1/knowledge/:id',
    { schema: { params: knowledgeIdParamsSchema, body: updateKnowledgeBodySchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateKnowledgeBody;
      await handlers.update.execute(updateKnowledgeCommand({ knowledgeId: id, tenantId, ...body }));
      return { status: 'updated' };
    },
  );

  app.delete(
    '/v1/knowledge/:id',
    { schema: { params: knowledgeIdParamsSchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      await handlers.delete.execute(deleteKnowledgeCommand({ knowledgeId: id, tenantId }));
      return { status: 'deleted' };
    },
  );

  app.post(
    '/v1/knowledge/:id/visibility',
    { schema: { params: knowledgeIdParamsSchema, body: changeKnowledgeVisibilityBodySchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      const body = request.body as ChangeKnowledgeVisibilityBody;
      await handlers.changeVisibility.execute(
        changeKnowledgeVisibilityCommand({ knowledgeId: id, tenantId, visibility: body.visibility }),
      );
      return { status: 'visibility_changed', visibility: body.visibility };
    },
  );

  app.post(
    '/v1/knowledge/:id/import',
    { schema: { params: knowledgeIdParamsSchema, body: importKnowledgeBodySchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      const body = request.body as ImportKnowledgeBody;
      await handlers.import.execute(
        importKnowledgeCommand({ knowledgeId: id, tenantId, ...body }),
      );
      return { status: 'imported' };
    },
  );

  app.post(
    '/v1/webhooks/knowledge',
    { schema: { body: createWebhookKnowledgeBodySchema } },
    async (request, reply) => {
      verifyWebhookAuth(request);
      const tenantId = requireTenantId(request);

      const {
        title,
        type,
        content,
        visibility = 'private',
        description,
        labels,
      } = request.body as CreateWebhookKnowledgeBody;

      const isUrlSource = type === 'webpage' || type === 'pdf' || type === 'video';

      const { knowledgeId } = await handlers.create.execute(
        createKnowledgeCommand({
          tenantId,
          title,
          type,
          visibility,
          sourceKind: isUrlSource ? 'url' : 'manual',
          sourceUri: isUrlSource ? content : undefined,
          description,
          labels,
        }),
      );

      let documentId: string | undefined = undefined;
      if (documentHandlers !== undefined && content !== undefined && content.trim().length > 0) {
        const docResult = await documentHandlers.create.execute(
          createDocumentCommand({
            tenantId,
            content,
            mimeType: 'text/plain',
            encoding: 'utf-8',
          }),
        );
        documentId = docResult.documentId;

        await handlers.attachContent.execute(
          attachKnowledgeContentCommand({
            knowledgeId,
            reference: documentId,
            mimeType: 'text/plain',
          }),
        );
      }

      await reply.status(201).send({
        status: 'success',
        knowledgeId,
        documentId,
      });
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

  app.post('/v1/knowledge/upload', async (request, reply) => {
    const tenantId = requireTenantId(request);

    const fileData = await request.file();
    if (!fileData) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await fileData.toBuffer();
    const filename = fileData.filename;
    const mimeType = fileData.mimetype;

    let text = '';
    if (mimeType === 'application/pdf') {
      try {
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = (pdfParseModule.default || pdfParseModule) as any;
        const parsed = await pdfParse(buffer);
        text = parsed.text;
      } catch (err) {
        throw new Error(`Failed to parse PDF file: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      filename.endsWith('.txt') ||
      filename.endsWith('.md')
    ) {
      text = buffer.toString('utf-8');
    } else {
      return reply.status(400).send({
        error: `Unsupported file type: ${mimeType}. Please upload a PDF, text, or markdown file.`,
      });
    }

    const { knowledgeId } = await handlers.create.execute(
      createKnowledgeCommand({
        tenantId,
        title: filename,
        type: 'document',
        visibility: 'private',
        sourceKind: 'manual',
      }),
    );

    if (documentHandlers !== undefined) {
      const docResult = await documentHandlers.create.execute(
        createDocumentCommand({
          tenantId,
          content: text,
          mimeType,
          encoding: 'utf-8',
        }),
      );

      await handlers.attachContent.execute(
        attachKnowledgeContentCommand({
          knowledgeId,
          reference: docResult.documentId,
          mimeType,
        }),
      );

      return reply.status(201).send({
        status: 'success',
        knowledgeId,
        documentId: docResult.documentId,
      });
    }

    return reply.status(201).send({
      status: 'success',
      knowledgeId,
    });
  });
}
