import { ConflictError, assignRoleCommand, createUserCommand } from '@wisdum/application';
import type { AccessPolicy, IdGenerator } from '@wisdum/application';
import type { PgPool } from '@wisdum/database';
import type { Clock } from '@wisdum/domain';
import type { TenantId } from '@wisdum/types';
import type { IdentityHandlers } from '../container/tokens.js';

export interface ProvisionTenantDeps {
  readonly handlers: IdentityHandlers;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly access: AccessPolicy;
  /** Absent when the API runs against in-memory repositories. */
  readonly pool?: PgPool;
}

export interface ProvisionTenantInput {
  readonly orgName: string;
  readonly orgSlug: string;
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
  /** Pins the tenant id instead of generating one. Used by the development seed. */
  readonly tenantId?: TenantId;
}

export interface ProvisionedTenant {
  readonly tenantId: TenantId;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId: string;
  /** The roles the first user was given: the tenant's owner role. */
  readonly roleIds: readonly string[];
}

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * Creates a tenant with its organization, default workspace, and first user,
 * who becomes the tenant's owner.
 *
 * The steps are not wrapped in one transaction (the user is written through
 * its own repository), so a failure after the tenant row leaves a partial
 * tenant; this is a known deficiency recorded in the Identity domain notes.
 */
export async function provisionTenant(
  deps: ProvisionTenantDeps,
  input: ProvisionTenantInput,
): Promise<ProvisionedTenant> {
  const { handlers, ids, clock, access, pool } = deps;
  const tenantId = input.tenantId ?? (ids.nextId() as string as TenantId);
  const organizationId = ids.nextId();
  const workspaceId = ids.nextId();
  const now = clock.now();

  if (pool !== undefined) {
    try {
      await pool.query(
        'INSERT INTO tenants (id, slug, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [tenantId, input.orgSlug, input.orgName, now, now],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('An organization with this slug already exists', {
          slug: input.orgSlug,
        });
      }
      throw error;
    }

    await pool.query(
      `INSERT INTO organizations (
         id, tenant_id, name, slug, status, subscription_plan, subscription_external_ref, subscription_state, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        organizationId,
        tenantId,
        input.orgName,
        input.orgSlug,
        'active',
        'free',
        'none',
        'active',
        now,
        now,
      ],
    );

    await pool.query(
      `INSERT INTO workspaces (id, tenant_id, organization_id, name, slug, status, max_members, max_knowledge_assets, max_storage_bytes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        workspaceId,
        tenantId,
        organizationId,
        `${input.orgName} Workspace`,
        input.orgSlug,
        'active',
        null,
        null,
        null,
        now,
        now,
      ],
    );
  }

  const { userId } = await handlers.createUser.execute(
    createUserCommand({
      tenantId,
      email: input.email,
      displayName: input.displayName,
      password: input.password,
    }),
  );

  if (pool !== undefined) {
    await pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4)',
      [workspaceId, userId, 'owner', now],
    );
  }

  const ownerRoleId = access.systemRoleId(tenantId, 'owner');
  await handlers.assignRole.execute(
    assignRoleCommand({
      tenantId,
      userId,
      roleId: ownerRoleId,
      // The system itself makes the first user an owner, so it acts with everything the role grants.
      grantorPermissions: access.permissionsOfSystemRole('owner').toArray(),
    }),
  );

  return { tenantId, organizationId, workspaceId, userId, roleIds: [ownerRoleId] };
}
