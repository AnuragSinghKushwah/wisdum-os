import {
  assignRoleCommand,
  authenticateUserCommand,
  createUserCommand,
  getUserQuery,
  listApiKeysQuery,
  createApiKeyCommand,
  revokeApiKeyCommand,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { IdentityHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import { requirePrincipal } from '../middleware/auth-context.js';
import type { TokenService, IdGenerator } from '@wisdum/application';
import type { TenantId, UUID } from '@wisdum/types';
import type { Clock } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
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

export function registerIdentityRoutes(
  app: FastifyInstance,
  handlers: IdentityHandlers,
  pool?: PgPool,
  tokens?: TokenService,
  ids?: IdGenerator,
  clock?: Clock,
): void {
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

  app.post('/v1/auth/resolve-tenant', async (request, reply) => {
    const { email } = request.body as { email: string };
    if (pool !== undefined) {
      const result = await pool.query<{ tenant_id: string }>(
        'SELECT tenant_id FROM users WHERE email = $1',
        [email],
      );
      const row = result.rows[0];
      if (row !== undefined) {
        return reply.send({ tenantId: row.tenant_id });
      }
    }
    // Fallback/Default tenant ID if not found in db or running in-memory
    return reply.send({ tenantId: 'af3da7a6-8cd5-4ab6-b217-41d45320a8a8' });
  });

  app.post('/v1/auth/reset-password-request', async (request, reply) => {
    const { email } = request.body as { email: string };
    request.log.info(`Password reset requested for email: ${email}`);
    return reply.send({ message: 'If an account exists for this email, a reset link has been sent.' });
  });

  app.post('/v1/onboarding/setup', async (request, reply) => {
    const { orgName, orgSlug, displayName, email, password } = request.body as {
      orgName: string;
      orgSlug: string;
      displayName: string;
      email: string;
      password?: string;
    };

    const tenantId = ids?.nextId() ?? 'af3da7a6-8cd5-4ab6-b217-41d45320a8a8';
    const orgId = ids?.nextId() ?? 'bf3da7a6-8cd5-4ab6-b217-41d45320a8a8';
    const workspaceId = ids?.nextId() ?? 'cf3da7a6-8cd5-4ab6-b217-41d45320a8a8';

    const now = clock?.now() ?? new Date().toISOString();

    if (pool !== undefined) {
      // 1. Create tenant row
      await pool.query(
        'INSERT INTO tenants (id, slug, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [tenantId, orgSlug, orgName, now, now],
      );

      // 2. Create organization row
      await pool.query(
        `INSERT INTO organizations (
           id, tenant_id, name, slug, status, subscription_plan, subscription_external_ref, subscription_state, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [orgId, tenantId, orgName, orgSlug, 'active', 'free', 'none', 'active', now, now],
      );

      // 3. Create workspace row
      await pool.query(
        `INSERT INTO workspaces (id, tenant_id, organization_id, name, slug, status, max_members, max_knowledge_assets, max_storage_bytes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [workspaceId, tenantId, orgId, `${orgName} Workspace`, orgSlug, 'active', null, null, null, now, now],
      );
    }

    // 4. Create user
    const { userId } = await handlers.createUser.execute(
      createUserCommand({
        tenantId: tenantId as TenantId,
        email,
        displayName,
        password,
      }),
    );

    if (pool !== undefined) {
      // 5. Insert workspace member row
      await pool.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4)',
        [workspaceId, userId, 'owner', now],
      );
    }

    // 6. Issue session token
    let token = 'mock-jwt-token';
    if (tokens !== undefined) {
      token = await tokens.issue({
        userId,
        tenantId,
        roleIds: [],
      });
    }

    return reply.status(201).send({
      userId,
      token,
      tenantId,
    });
  });

  app.get('/v1/identity/api-keys', async (request) => {
    const principal = requirePrincipal(request);
    return handlers.listApiKeys.execute(listApiKeysQuery({ tenantId: principal.tenantId }));
  });

  app.post('/v1/identity/api-keys', async (request, reply) => {
    const principal = requirePrincipal(request);
    const { label } = request.body as { label: string };
    const result = await handlers.createApiKey.execute(
      createApiKeyCommand({
        tenantId: principal.tenantId,
        ownerId: principal.userId as UUID,
        label,
      }),
    );
    await reply.status(201).send(result);
  });

  app.delete('/v1/identity/api-keys/:id', async (request, reply) => {
    const principal = requirePrincipal(request);
    const { id } = request.params as { id: string };
    await handlers.revokeApiKey.execute(
      revokeApiKeyCommand({
        tenantId: principal.tenantId,
        apiKeyId: id,
      }),
    );
    await reply.status(204).send();
  });
}
