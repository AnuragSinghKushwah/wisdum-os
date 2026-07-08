import {
  generateContentDraftCommand,
  getContentDraftQuery,
  getOpportunityQuery,
  getPublishedContentQuery,
  listOpportunitiesQuery,
  publishContentDraftCommand,
  updateContentDraftCommand,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { OpportunityHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  draftIdParamsSchema,
  opportunityIdParamsSchema,
  publishedContentIdParamsSchema,
  updateContentDraftBodySchema,
} from '../validation/opportunity-schemas.js';

interface UpdateContentDraftBody {
  readonly title: string;
  readonly body: string;
}

/** Wires the Opportunity context's handlers to HTTP — Create/Publish/Measure steps of the Core Loop. */
export function registerOpportunityRoutes(app: FastifyInstance, handlers: OpportunityHandlers): void {
  app.get('/v1/opportunities', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.list.execute(listOpportunitiesQuery({ tenantId }));
  });

  app.get(
    '/v1/opportunities/:id',
    { schema: { params: opportunityIdParamsSchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      return handlers.get.execute(getOpportunityQuery({ tenantId, opportunityId: id }));
    },
  );

  app.post(
    '/v1/opportunities/:id/draft',
    { schema: { params: opportunityIdParamsSchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      const result = await handlers.generateDraft.execute(
        generateContentDraftCommand({ tenantId, opportunityId: id }),
      );
      await reply.status(201).send(result);
    },
  );

  app.get('/v1/drafts/:id', { schema: { params: draftIdParamsSchema } }, async (request) => {
    const tenantId = requireTenantId(request);
    const { id } = request.params as { id: string };
    return handlers.getDraft.execute(getContentDraftQuery({ tenantId, draftId: id }));
  });

  app.put(
    '/v1/drafts/:id',
    { schema: { params: draftIdParamsSchema, body: updateContentDraftBodySchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateContentDraftBody;
      await handlers.updateDraft.execute(
        updateContentDraftCommand({ tenantId, draftId: id, ...body }),
      );
      return { status: 'updated' };
    },
  );

  app.post(
    '/v1/drafts/:id/publish',
    { schema: { params: draftIdParamsSchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      return handlers.publishDraft.execute(publishContentDraftCommand({ tenantId, draftId: id }));
    },
  );

  // Public, unauthenticated route — the Measure step (Product Bible §11).
  app.get(
    '/v1/published/:id',
    { schema: { params: publishedContentIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      return handlers.getPublished.execute(getPublishedContentQuery({ publishedContentId: id }));
    },
  );
}
