import { ConflictError, createUserCommand } from '@wisdum/application';
import type { Environment } from '@wisdum/config';
import { ConfigurationError } from '@wisdum/errors';
import type { TenantId } from '@wisdum/types';
import { provisionTenant } from './provision-tenant.js';
import type { ProvisionTenantDeps } from './provision-tenant.js';

/**
 * The development account created by `WISDUM_DEV_SEED=true`. These are
 * deliberately public so local tooling can sign in, which is exactly why the
 * seed refuses to run in production.
 */
export const DEV_SEED = {
  tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
  orgName: 'Wisdum Development',
  orgSlug: 'wisdum-dev',
  displayName: 'Dev User',
  email: 'dev@wisdum.local',
  password: 'wisdum-dev-password',
} as const;

export interface DevSeedDeps extends ProvisionTenantDeps {
  readonly environment: Environment;
}

/**
 * Ensures the development tenant and user exist. Idempotent, so it is safe
 * to run on every boot against a persistent database.
 */
export async function seedDevelopmentData(deps: DevSeedDeps): Promise<void> {
  if (deps.environment === 'production') {
    throw new ConfigurationError(
      'WISDUM_DEV_SEED must not be enabled in production: it creates an account with a public password.',
      { variable: 'WISDUM_DEV_SEED' },
    );
  }

  const tenantExists =
    deps.pool !== undefined &&
    (await deps.pool.query('SELECT 1 FROM tenants WHERE id = $1', [DEV_SEED.tenantId])).rows.length > 0;

  if (!tenantExists) {
    await provisionTenant(deps, {
      tenantId: DEV_SEED.tenantId,
      orgName: DEV_SEED.orgName,
      orgSlug: DEV_SEED.orgSlug,
      displayName: DEV_SEED.displayName,
      email: DEV_SEED.email,
      password: DEV_SEED.password,
    });
    return;
  }

  try {
    await deps.handlers.createUser.execute(
      createUserCommand({
        tenantId: DEV_SEED.tenantId,
        email: DEV_SEED.email,
        displayName: DEV_SEED.displayName,
        password: DEV_SEED.password,
      }),
    );
  } catch (error) {
    if (!(error instanceof ConflictError)) {
      throw error;
    }
  }
}
