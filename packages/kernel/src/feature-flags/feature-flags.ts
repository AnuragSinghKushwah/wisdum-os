import type { TenantId } from '@wisdum/types';
import { createToken } from '../di/token.js';

/**
 * Feature flag evaluation port. Workspace-level flag state lives in the
 * Workspace domain; this port answers platform-level questions ("is this
 * capability rolled out for this tenant?") and may be backed by config,
 * the database, or an external flag service.
 */
export interface FeatureFlagProvider {
  isEnabled(flag: string, tenantId?: TenantId): Promise<boolean>;
}

/** DI token under which the active FeatureFlagProvider is registered. */
export const FEATURE_FLAG_PROVIDER = createToken<FeatureFlagProvider>(
  'kernel.feature-flag-provider',
);

/** Fixed flag set for composition roots and tests. */
export class StaticFeatureFlagProvider implements FeatureFlagProvider {
  constructor(private readonly flags: Readonly<Record<string, boolean>>) {}

  isEnabled(flag: string): Promise<boolean> {
    return Promise.resolve(this.flags[flag] === true);
  }
}
