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

}
