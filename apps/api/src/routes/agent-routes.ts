import type { FastifyInstance } from 'fastify';
import { requireTenantId } from '../middleware/tenant-context.js';
import type { AgentHandlers } from '../container/tokens.js';
import { createAgentTaskCommand, listAgentTasksQuery } from '@wisdum/application';
import { createAgentTaskBodySchema } from '../validation/agent-schemas.js';

export function registerAgentRoutes(app: FastifyInstance, handlers: AgentHandlers): void {
  app.get('/v1/agents/tasks', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.list.execute(listAgentTasksQuery({ tenantId }));
  });

  app.post(
    '/v1/agents/tasks',
    { schema: { body: createAgentTaskBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const { agentType, payload } = request.body as { agentType: string; payload: Record<string, any> };

      const { taskId } = await handlers.create.execute(
        createAgentTaskCommand({
          tenantId,
          agentType,
          payload,
        }),
      );

      return reply.status(202).send({ taskId, status: 'pending' });
    },
  );
}
