import {
  createOpportunityCommand,
  dismissOpportunityCommand,
  generateContentDraftCommand,
  getContentDraftQuery,
  getOpportunityQuery,
  getPublishedContentQuery,
  listContentDraftsQuery,
  listOpportunitiesQuery,
  listPublishedContentQuery,
  publishContentDraftCommand,
  updateContentDraftCommand,
} from '@wisdum/application';
import type { KnowledgeReadModel } from '@wisdum/application';
import type { OpportunityRepository, InsightRepository } from '@wisdum/domain';
import type { FastifyInstance } from 'fastify';
import type { OpportunityHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  draftIdParamsSchema,
  opportunityIdParamsSchema,
  publishedContentIdParamsSchema,
  updateContentDraftBodySchema,
} from '../validation/opportunity-schemas.js';

interface CreateOpportunityBody {
  readonly title: string;
  readonly type: string;
  readonly rationale: string;
}

interface UpdateContentDraftBody {
  readonly title: string;
  readonly body: string;
}

/** Wires the Opportunity context's handlers to HTTP — Create/Publish/Measure steps of the Core Loop. */
export function registerOpportunityRoutes(
  app: FastifyInstance,
  handlers: OpportunityHandlers,
  repository: OpportunityRepository,
  insights: InsightRepository,
  knowledgeReads: KnowledgeReadModel,
): void {
  app.get('/v1/opportunities', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.list.execute(listOpportunitiesQuery({ tenantId }));
  });

  app.get('/v1/dashboard/stats', async (request) => {
    const tenantId = requireTenantId(request);
    const [knowledge, opportunities, drafts, published] = await Promise.all([
      knowledgeReads.listByTenant(tenantId),
      handlers.list.execute(listOpportunitiesQuery({ tenantId })),
      handlers.listDrafts.execute(listContentDraftsQuery({ tenantId })),
      handlers.listPublished.execute(listPublishedContentQuery({ tenantId })),
    ]);
    return {
      knowledgeCount: knowledge.length,
      opportunityCount: opportunities.length,
      draftCount: drafts.length,
      publishedCount: published.length,
    };
  });

  app.post(
    '/v1/opportunities',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'type', 'rationale'],
          properties: {
            title: { type: 'string', minLength: 1 },
            type: { type: 'string' },
            rationale: { type: 'string', minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as CreateOpportunityBody;

      const result = await handlers.create.execute(
        createOpportunityCommand({
          tenantId,
          ...body,
        }),
      );
      await reply.status(201).send(result);
    },
  );

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
    '/v1/opportunities/:id/dismiss',
    { schema: { params: opportunityIdParamsSchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params as { id: string };
      await handlers.dismiss.execute(dismissOpportunityCommand({ tenantId, opportunityId: id }));
      return { status: 'dismissed' };
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

  app.get('/v1/drafts', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.listDrafts.execute(listContentDraftsQuery({ tenantId }));
  });

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
        updateContentDraftCommand({ draftId: id, ...body, tenantId }),
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

  app.get('/v1/published', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.listPublished.execute(listPublishedContentQuery({ tenantId }));
  });

  app.get(
    '/v1/published/:id',
    // Published pieces are shared publicly by their unguessable id; see GetPublishedContentQuery.
    { config: { public: true }, schema: { params: publishedContentIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      return handlers.getPublished.execute(getPublishedContentQuery({ publishedContentId: id }));
    },
  );
}
