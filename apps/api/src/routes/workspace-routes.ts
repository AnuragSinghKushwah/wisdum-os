import {
  addWorkspaceMemberCommand,
  createWorkspaceCommand,
  getWorkspaceQuery,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { WorkspaceHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  addWorkspaceMemberBodySchema,
  createWorkspaceBodySchema,
  workspaceIdParamsSchema,
} from '../validation/workspace-schemas.js';

interface CreateWorkspaceBody {
  readonly organizationId: string;
  readonly name: string;
  readonly createdBy: string;
}

interface AddWorkspaceMemberBody {
  readonly userId: string;
  readonly role: 'owner' | 'admin' | 'member' | 'guest';
}

export function registerWorkspaceRoutes(app: FastifyInstance, handlers: WorkspaceHandlers): void {
  app.post(
    '/v1/workspaces',
    { schema: { body: createWorkspaceBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as CreateWorkspaceBody;
      const result = await handlers.create.execute(createWorkspaceCommand({ tenantId, ...body }));
      await reply.status(201).send(result);
    },
  );

  app.get(
    '/v1/workspaces/:id',
    { schema: { params: workspaceIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      return handlers.get.execute(getWorkspaceQuery({ workspaceId: id }));
    },
  );

  app.post(
    '/v1/workspaces/:id/members',
    { schema: { params: workspaceIdParamsSchema, body: addWorkspaceMemberBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as AddWorkspaceMemberBody;
      await handlers.addMember.execute(addWorkspaceMemberCommand({ workspaceId: id, ...body }));
      return { status: 'added' };
    },
  );
}
