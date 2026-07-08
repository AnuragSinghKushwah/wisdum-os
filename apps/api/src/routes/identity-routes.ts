import {
  assignRoleCommand,
  authenticateUserCommand,
  createUserCommand,
  getUserQuery,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { IdentityHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  assignRoleBodySchema,
  createUserBodySchema,
  loginBodySchema,
  userIdParamsSchema,
} from '../validation/identity-schemas.js';

interface CreateUserBody {
  readonly email: string;
  readonly displayName: string;
  readonly password?: string;
}

interface AssignRoleBody {
  readonly roleId: string;
}

interface LoginBody {
  readonly email: string;
  readonly password: string;
}

export function registerIdentityRoutes(app: FastifyInstance, handlers: IdentityHandlers): void {
  app.post('/v1/users', { schema: { body: createUserBodySchema } }, async (request, reply) => {
    const tenantId = requireTenantId(request);
    const body = request.body as CreateUserBody;
    const result = await handlers.createUser.execute(createUserCommand({ tenantId, ...body }));
    await reply.status(201).send(result);
  });

  app.get('/v1/users/:id', { schema: { params: userIdParamsSchema } }, async (request) => {
    const { id } = request.params as { id: string };
    return handlers.getUser.execute(getUserQuery({ userId: id }));
  });

  app.post(
    '/v1/users/:id/roles',
    { schema: { params: userIdParamsSchema, body: assignRoleBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const { roleId } = request.body as AssignRoleBody;
      await handlers.assignRole.execute(assignRoleCommand({ userId: id, roleId }));
      return { status: 'assigned' };
    },
  );

  app.post('/v1/auth/login', { schema: { body: loginBodySchema } }, async (request) => {
    const tenantId = requireTenantId(request);
    const { email, password } = request.body as LoginBody;
    return handlers.authenticate.execute(authenticateUserCommand({ tenantId, email, password }));
  });
}
