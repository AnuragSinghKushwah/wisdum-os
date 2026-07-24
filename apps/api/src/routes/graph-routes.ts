import { getGraphNeighborsQuery, getGraphTopologyQuery } from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { GraphHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';

export function registerGraphRoutes(app: FastifyInstance, handlers: GraphHandlers): void {
  app.get('/v1/graph', async (request, reply) => {
    const tenantId = requireTenantId(request);
    const topology = await handlers.getTopology.execute(getGraphTopologyQuery(tenantId));
    return reply.send(topology);
  });

  app.get('/v1/graph/neighbors', async (request, reply) => {
    const tenantId = requireTenantId(request);
    const { conceptId, depth } = request.query as { conceptId?: string; depth?: string };
    if (!conceptId) {
      return reply.status(400).send({ error: 'conceptId query parameter is required' });
    }
    const parsedDepth = depth ? parseInt(depth, 10) : 1;
    const neighbors = await handlers.getNeighbors.execute(
      getGraphNeighborsQuery(tenantId, conceptId, parsedDepth),
    );
    return reply.send(neighbors);
  });

  app.get('/v1/graph/concepts', async (request, reply) => {
    const tenantId = requireTenantId(request);
    const topology = await handlers.getTopology.execute(getGraphTopologyQuery(tenantId));
    return reply.send(topology.nodes);
  });

  app.get('/v1/graph/relationships', async (request, reply) => {
    const tenantId = requireTenantId(request);
    const topology = await handlers.getTopology.execute(getGraphTopologyQuery(tenantId));
    return reply.send(topology.edges);
  });
}
