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

import type { PgPool } from '@wisdum/database';

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

export function registerSearchRoutes(
  app: FastifyInstance,
  handlers: SearchHandlers,
  pool?: PgPool,
  vectorStore?: any,
  embeddings?: any,
  embeddingModel?: string,
): void {
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

  app.get('/v1/search', async (request, reply) => {
    const tenantId = requireTenantId(request);
    const { q = '', mode = 'keyword' } = request.query as { q?: string; mode?: 'keyword' | 'semantic' | 'hybrid' };

    if (q.trim().length === 0) {
      return reply.send([]);
    }

    // 1. Semantic search if mode is semantic or hybrid
    if ((mode === 'semantic' || mode === 'hybrid') && vectorStore && embeddings && embeddingModel) {
      try {
        const embedded = await embeddings.embed({ model: embeddingModel, input: [q] });
        const queryVector = embedded.vectors[0] ?? [];
        // We use the tenant ID as the vector index name matching upload pipeline
        const indexName = `knowledge:${tenantId}`;
        const hits = await vectorStore.query(indexName, queryVector, 10);
        
        // Resolve knowledge titles and metadata for these hits from DB
        const ids = hits.map((h: any) => h.id.split('#')[0]); // vector id is `${sourceId}#${chunkIndex}`
        const uniqueIds = [...new Set(ids)];
        
        if (uniqueIds.length > 0 && pool) {
          const dbResult = await pool.query<{ id: string; title: string; type: string }>(
            'SELECT id, title, type FROM knowledge WHERE id = ANY($1)',
            [uniqueIds],
          );
          const dbMap = new Map(dbResult.rows.map((row) => [row.id, row]));
          
          const semanticResults = hits.map((hit: any) => {
            const sourceId = hit.id.split('#')[0];
            const row = dbMap.get(sourceId);
            return {
              id: sourceId,
              title: row?.title ?? 'Untitled Knowledge',
              type: row?.type ?? 'concept',
              score: hit.score,
            };
          }).filter((item: any) => item.title !== 'Untitled Knowledge');

          // If mode is just semantic, return these results
          if (mode === 'semantic') {
            return reply.send(semanticResults);
          }
          
          // Hybrid mode logic: combine keyword and semantic results
          if (mode === 'hybrid' && pool) {
            const kwResult = await pool.query<{ id: string; title: string; type: string }>(
              `SELECT id, title, type FROM knowledge 
               WHERE tenant_id = $1 AND (title ILIKE $2) 
               LIMIT 10`,
              [tenantId, `%${q}%`],
            );
            
            // Merge scores
            const mergedMap = new Map<string, { id: string; title: string; type: string; score: number }>();
            for (const item of semanticResults) {
              mergedMap.set(item.id, { ...item, score: item.score * 0.7 }); // semantic weight 0.7
            }
            for (const row of kwResult.rows) {
              const existing = mergedMap.get(row.id);
              if (existing) {
                existing.score += 0.3; // increase score if it matches both
              } else {
                mergedMap.set(row.id, { id: row.id, title: row.title, type: row.type, score: 0.3 });
              }
            }
            return reply.send(Array.from(mergedMap.values()).sort((a, b) => b.score - a.score));
          }
        }
      } catch (err) {
        // Fallback to keyword search on error
        app.log.error(err, 'Semantic search failed, falling back to keyword search');
      }
    }

    // Default or fallback: keyword search
    if (pool !== undefined) {
      const result = await pool.query<{ id: string; title: string; type: string }>(
        `SELECT id, title, type FROM knowledge 
         WHERE tenant_id = $1 AND (title ILIKE $2) 
         LIMIT 10`,
        [tenantId, `%${q}%`],
      );
      return reply.send(
        result.rows.map((row) => ({
          id: row.id,
          title: row.title,
          type: row.type,
          score: 1.0,
        })),
      );
    }

    return reply.send([]);
  });
}
