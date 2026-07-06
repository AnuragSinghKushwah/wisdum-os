/**
 * Typed access to environment configuration.
 *
 * Reads are explicit and fail fast: callers declare exactly which variables
 * they need and receive a `ConfigurationError` when one is absent.
 */
import { ConfigurationError } from '@wisdum/errors';

export type Environment = 'development' | 'test' | 'production';

const ENVIRONMENTS: readonly Environment[] = ['development', 'test', 'production'];

type EnvSource = Readonly<Record<string, string | undefined>>;

/** Resolve the runtime environment from `WISDUM_ENV` (defaults to `development`). */
export function getEnvironment(env: EnvSource = process.env): Environment {
  const raw = env['WISDUM_ENV'] ?? 'development';
  const match = ENVIRONMENTS.find((candidate) => candidate === raw);
  if (!match) {
    throw new ConfigurationError(`Unsupported WISDUM_ENV value: ${raw}`, {
      variable: 'WISDUM_ENV',
      allowed: ENVIRONMENTS,
    });
  }
  return match;
}

/** Read a required environment variable, failing fast when it is missing or empty. */
export function requireEnv(name: string, env: EnvSource = process.env): string {
  const value = env[name];
  if (value === undefined || value === '') {
    throw new ConfigurationError(`Missing required environment variable: ${name}`, {
      variable: name,
    });
  }
  return value;
}

/** Read an optional environment variable with an explicit fallback. */
export function optionalEnv(name: string, fallback: string, env: EnvSource = process.env): string {
  const value = env[name];
  return value === undefined || value === '' ? fallback : value;
}
