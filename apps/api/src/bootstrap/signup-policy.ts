import { AuthorizationError } from '@wisdum/application';
import type { PgPool } from '@wisdum/database';

/** Decides whether `POST /v1/onboarding/setup` may create another tenant. */
export interface SignupPolicy {
  /** Throws `AuthorizationError` when sign-up is closed. */
  assertAllowed(): Promise<void>;
  /** Tells the policy a tenant now exists (needed only without a database). */
  recordTenantCreated(): void;
}

export interface SignupPolicyOptions {
  /** `WISDUM_ALLOW_SIGNUP=true`: anyone may create a tenant, as on a hosted multi-tenant deployment. */
  readonly allowOpenSignup: boolean;
  /** Absent when the API runs against in-memory repositories. */
  readonly pool?: PgPool;
}

/**
 * Sign-up is closed by default. The first tenant can always be created, which
 * is how a self-hosted instance is bootstrapped; after that, new tenants need
 * `WISDUM_ALLOW_SIGNUP=true`.
 *
 * The check and the insert are separate steps, so two simultaneous
 * first-run requests could both pass. That window only exists before the
 * instance has any tenant.
 */
export function createSignupPolicy(options: SignupPolicyOptions): SignupPolicy {
  let tenantRecorded = false;

  async function hasTenant(): Promise<boolean> {
    if (options.pool === undefined) {
      return tenantRecorded;
    }
    const result = await options.pool.query('SELECT 1 FROM tenants LIMIT 1');
    return result.rows.length > 0;
  }

  return {
    async assertAllowed() {
      if (options.allowOpenSignup) {
        return;
      }
      if (await hasTenant()) {
        throw new AuthorizationError(
          'Sign-up is closed on this instance. Ask an administrator to create your account. ' +
            'If you run this instance yourself, start it once with WISDUM_ALLOW_SIGNUP=true ' +
            '(for example `npm run local -- --signup`), create your account, then restart without it.',
        );
      }
    },
    recordTenantCreated() {
      tenantRecorded = true;
    },
  };
}
