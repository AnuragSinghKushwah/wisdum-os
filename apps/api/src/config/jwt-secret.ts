import { randomBytes } from 'node:crypto';
import type { Environment } from '@wisdum/config';
import { ConfigurationError } from '@wisdum/errors';

const MIN_SECRET_LENGTH = 32;

/**
 * Values that have shipped as defaults in this repository. They are public,
 * so a deployment that signs tokens with one can have its tokens forged.
 */
const KNOWN_PUBLIC_SECRETS: ReadonlySet<string> = new Set([
  'dev-secret-change-me',
  'wisdum-prod-jwt-secret-replace-in-production',
  'change-this-to-a-secure-random-64-char-secret-in-production',
]);

/** A value someone forgot to replace: template text such as "change-this-…" or "replace_with_…". */
const PLACEHOLDER_PATTERN =
  /change[-_ ]?(this|me)|replace[-_ ]?(this|with|me)|your[-_ ]secret|placeholder/i;

export interface ResolvedJwtSecret {
  readonly secret: string;
  /** True when no secret was configured and a throwaway one was generated. */
  readonly generated: boolean;
}

/**
 * Decides which secret signs bearer tokens.
 *
 * - A configured secret must be at least 32 characters and must not be one of
 *   the publicly known defaults, in every environment.
 * - With none configured, production refuses to start; development and test
 *   get a random per-process secret, so tokens simply stop working on restart
 *   instead of being forgeable by anyone who has read the source.
 */
export function resolveJwtSecret(
  configured: string | undefined,
  environment: Environment,
  generate: () => string = () => randomBytes(32).toString('hex'),
): ResolvedJwtSecret {
  if (configured === undefined || configured === '') {
    if (environment === 'production') {
      throw new ConfigurationError(
        'JWT_SECRET must be set in production (at least 32 characters). Generate one with `openssl rand -hex 32`.',
        { variable: 'JWT_SECRET' },
      );
    }
    return { secret: generate(), generated: true };
  }
  if (KNOWN_PUBLIC_SECRETS.has(configured) || PLACEHOLDER_PATTERN.test(configured)) {
    throw new ConfigurationError(
      'JWT_SECRET is a publicly known default or an unreplaced placeholder; choose a unique secret.',
      { variable: 'JWT_SECRET' },
    );
  }
  if (configured.length < MIN_SECRET_LENGTH) {
    throw new ConfigurationError(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
      { variable: 'JWT_SECRET', length: configured.length },
    );
  }
  return { secret: configured, generated: false };
}
