import { runReasoningPassCommand } from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { ReasoningHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';

/** Wires the manually-triggered reasoning pass (Product Bible §5) to HTTP. */
export function registerReasoningRoutes(app: FastifyInstance, handlers: ReasoningHandlers): void {
  app.post('/v1/reasoning/run', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.run.execute(runReasoningPassCommand({ tenantId }));
  });
}
