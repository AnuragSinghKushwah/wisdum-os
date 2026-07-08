import {
  createSearchIndexCommand,
  getSearchIndexQuery,
  indexSearchDocumentCommand,
  searchIndexQuery,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { SearchHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  createSearchIndexBodySchema,
  indexSearchDocumentBodySchema,
  searchIndexIdParamsSchema,
  searchQuerySchema,
} from '../validation/search-schemas.js';

interface CreateSearchIndexBody {
  readonly name: string;
  readonly mode: 'keyword' | 'semantic' | 'hybrid';
}

interface SearchQueryParams {
  readonly text: string;
  readonly mode?: 'keyword' | 'semantic' | 'hybrid';
  readonly limit?: number;
  readonly offset?: number;
}

interface IndexSearchDocumentBody {
  readonly sourceId: string;
  readonly sourceType: 'knowledge' | 'document' | 'conversation';
  readonly text: string;
  readonly chunkCount?: number;
}

export function registerSearchRoutes(app: FastifyInstance, handlers: SearchHandlers): void {
  app.post(
    '/v1/search-indexes',
    { schema: { body: createSearchIndexBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as CreateSearchIndexBody;
      const result = await handlers.createIndex.execute(
        createSearchIndexCommand({ tenantId, ...body }),
      );
      await reply.status(201).send(result);
    },
  );

  app.get(
    '/v1/search-indexes/:id',
    { schema: { params: searchIndexIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      return handlers.getIndex.execute(getSearchIndexQuery({ searchIndexId: id }));
    },
  );

  app.get(
    '/v1/search-indexes/:id/search',
    { schema: { params: searchIndexIdParamsSchema, querystring: searchQuerySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const query = request.query as SearchQueryParams;
      return handlers.search.execute(searchIndexQuery({ searchIndexId: id, ...query }));
    },
  );

  app.post(
    '/v1/search-indexes/:id/documents',
    { schema: { params: searchIndexIdParamsSchema, body: indexSearchDocumentBodySchema } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as IndexSearchDocumentBody;
      await handlers.indexDocument.execute(
        indexSearchDocumentCommand({ searchIndexId: id, ...body }),
      );
      await reply.status(202).send({ status: 'indexed' });
    },
  );
}
