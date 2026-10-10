import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads `KEY=value` lines from the first `.env` file found, for local development.
 *
 * Variables already set in the process environment win over the file, so
 * anything exported in the shell or set by a container still takes effect.
 * Returns the path that was loaded, or `undefined` when there is none or
 * the process is running in production (where configuration must come from
 * the environment, not from a file that happens to be on disk).
 */
export function loadEnvFile(
  candidates: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (environment['NODE_ENV'] === 'production') return undefined;
  for (const candidate of candidates) {
    const path = resolve(candidate);
    if (existsSync(path)) {
      process.loadEnvFile(path);
      return path;
    }
  }
  return undefined;
}
