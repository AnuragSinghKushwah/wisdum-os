import {
  assignRoleCommand,
  authenticateUserCommand,
  createUserCommand,
  getUserQuery,
  listApiKeysQuery,
  createApiKeyCommand,
  revokeApiKeyCommand,
} from '@wisdum/application';
import type { AccessPolicy, TokenService, IdGenerator } from '@wisdum/application';
import type { PgPool } from '@wisdum/database';
import type { Clock } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { FastifyInstance } from 'fastify';
import { provisionTenant } from '../bootstrap/provision-tenant.js';
import type { SignupPolicy } from '../bootstrap/signup-policy.js';
import type { IdentityHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import { requirePrincipal } from '../middleware/auth-context.js';
import {
  assignRoleBodySchema,
  createApiKeyBodySchema,
  createUserBodySchema,
  loginBodySchema,
  onboardingBodySchema,
  resolveTenantBodySchema,
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

interface OnboardingBody {
  readonly orgName: string;
  readonly orgSlug: string;
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
}

interface CreateApiKeyBody {
  readonly label: string;
  readonly scopes: readonly string[];
}

export interface IdentityRouteDependencies {
  readonly handlers: IdentityHandlers;
  readonly tokens: TokenService;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly access: AccessPolicy;
  readonly signupPolicy: SignupPolicy;
  /** Absent when the API runs against in-memory repositories. */
  readonly pool?: PgPool;
}

/** Routes that must work before the caller has any credential. */
const PUBLIC = { public: true } as const;

/**
 * Tenant a caller is assumed to belong to when none can be derived. Only the
 * pre-login lookup uses it, so a login form can still be shown against an
 * empty in-memory instance.
 */
const FALLBACK_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export function registerIdentityRoutes(app: FastifyInstance, deps: IdentityRouteDependencies): void {
  const { handlers, tokens, ids, clock, access, signupPolicy, pool } = deps;

  app.post('/v1/users', { schema: { body: createUserBodySchema } }, async (request, reply) => {
    const tenantId = requireTenantId(request);
    const body = request.body as CreateUserBody;
    const result = await handlers.createUser.execute(createUserCommand({ tenantId, ...body }));
    await reply.status(201).send(result);
  });

  app.get('/v1/users/:id', { schema: { params: userIdParamsSchema } }, async (request) => {
    const { id } = request.params as { id: string };
    return handlers.getUser.execute(getUserQuery({ tenantId: requireTenantId(request), userId: id }));
  });

  app.post(
    '/v1/users/:id/roles',
    { schema: { params: userIdParamsSchema, body: assignRoleBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const { roleId } = request.body as AssignRoleBody;
      const principal = requirePrincipal(request);
      await handlers.assignRole.execute(
        assignRoleCommand({
          tenantId: principal.tenantId,
          userId: id,
          roleId,
          grantorPermissions: principal.permissions.toArray(),
        }),
      );
      return { status: 'assigned' };
    },
  );

  app.get('/v1/identity/roles', async (request) => {
    const principal = requirePrincipal(request);
    return access.listSystemRoles(principal.tenantId);
  });

  app.post(
    '/v1/auth/login',
    { config: PUBLIC, schema: { body: loginBodySchema } },
    async (request) => {
      const tenantId = requireTenantId(request);
      const { email, password } = request.body as LoginBody;
      return handlers.authenticate.execute(authenticateUserCommand({ tenantId, email, password }));
    },
  );

  app.post(
    '/v1/auth/resolve-tenant',
    { config: PUBLIC, schema: { body: resolveTenantBodySchema } },
    async (request, reply) => {
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
      return reply.send({ tenantId: FALLBACK_TENANT_ID });
    },
  );

  app.post(
    '/v1/auth/reset-password-request',
    { config: PUBLIC, schema: { body: resolveTenantBodySchema } },
    async (request, reply) => {
      const { email } = request.body as { email: string };
      request.log.info(`Password reset requested for email: ${email}`);
      return reply.send({
        message: 'If an account exists for this email, a reset link has been sent.',
      });
    },
  );

  app.post(
    '/v1/onboarding/setup',
    { config: PUBLIC, schema: { body: onboardingBodySchema } },
    async (request, reply) => {
      await signupPolicy.assertAllowed();

      const provisioned = await provisionTenant(
        { handlers, ids, clock, access, pool },
        request.body as OnboardingBody,
      );
      signupPolicy.recordTenantCreated();

      const token = await tokens.issue({
        userId: provisioned.userId,
        tenantId: provisioned.tenantId,
        roleIds: provisioned.roleIds,
      });
      return reply
        .status(201)
        .send({ userId: provisioned.userId, token, tenantId: provisioned.tenantId });
    },
  );

  app.get('/v1/identity/api-keys', async (request) => {
    const principal = requirePrincipal(request);
    return handlers.listApiKeys.execute(listApiKeysQuery({ tenantId: principal.tenantId }));
  });

  app.post(
    '/v1/identity/api-keys',
    { schema: { body: createApiKeyBodySchema } },
    async (request, reply) => {
      const principal = requirePrincipal(request);
      const { label, scopes } = request.body as CreateApiKeyBody;
      const result = await handlers.createApiKey.execute(
        createApiKeyCommand({
          tenantId: principal.tenantId,
          ownerId: principal.userId as UUID,
          label,
          scopes,
          grantorPermissions: principal.permissions.toArray(),
        }),
      );
      await reply.status(201).send(result);
    },
  );

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
