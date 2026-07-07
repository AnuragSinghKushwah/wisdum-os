import {
  attachWorkspaceCommand,
  createOrganizationCommand,
  getOrganizationQuery,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { OrganizationHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  attachWorkspaceBodySchema,
  createOrganizationBodySchema,
  organizationIdParamsSchema,
} from '../validation/organization-schemas.js';

interface CreateOrganizationBody {
  readonly name: string;
}

interface AttachWorkspaceBody {
  readonly workspaceId: string;
}

export function registerOrganizationRoutes(
  app: FastifyInstance,
  handlers: OrganizationHandlers,
): void {
  app.post(
    '/v1/organizations',
    { schema: { body: createOrganizationBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as CreateOrganizationBody;
      const result = await handlers.create.execute(
        createOrganizationCommand({ tenantId, ...body }),
      );
      await reply.status(201).send(result);
    },
  );

  app.get(
    '/v1/organizations/:id',
    { schema: { params: organizationIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      return handlers.get.execute(getOrganizationQuery({ organizationId: id }));
    },
  );

  app.post(
    '/v1/organizations/:id/workspaces',
    { schema: { params: organizationIdParamsSchema, body: attachWorkspaceBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.body as AttachWorkspaceBody;
      await handlers.attachWorkspace.execute(
        attachWorkspaceCommand({ organizationId: id, workspaceId }),
      );
      return { status: 'attached' };
    },
  );
}
