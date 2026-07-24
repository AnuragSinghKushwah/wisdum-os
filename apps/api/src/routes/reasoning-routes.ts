import { runReasoningPassCommand } from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { ReasoningHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import type { ConceptRepository, ConceptRelationshipRepository } from '@wisdum/domain';

/** Wires the manually-triggered reasoning pass (Product Bible §5) to HTTP. */
export function registerReasoningRoutes(
  app: FastifyInstance,
  handlers: ReasoningHandlers,
  concepts: ConceptRepository,
  relationships: ConceptRelationshipRepository,
): void {
  app.post('/v1/reasoning/run', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.run.execute(runReasoningPassCommand({ tenantId }));
  });

  app.get('/v1/graph', async (request, reply) => {
    const tenantId = requireTenantId(request);

    const [conceptList, relationshipList] = await Promise.all([
      concepts.listByTenant(tenantId),
      relationships.listByTenant(tenantId),
    ]);

    return reply.send({
      nodes: conceptList.map((concept) => ({
        id: concept.getId().value(),
        label: concept.name.value,
        type: 'concept',
        weight: concept.mentionCount,
      })),
      edges: relationshipList.map((rel) => ({
        source: rel.conceptAId.value(),
        target: rel.conceptBId.value(),
        label: rel.relationshipType.value,
      })),
    });
  });
}
