import { getEnvironment } from '@wisdum/config';
import type { Environment } from '@wisdum/config';

/**
 * The environment the API treats itself as running in.
 *
 * `WISDUM_ENV` is authoritative, but `NODE_ENV=production` also counts: a
 * deployment that sets only the conventional variable must not silently get
 * development behaviour, so the stricter reading wins when they disagree.
 */
export function resolveRuntimeEnvironment(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Environment {
  const declared = getEnvironment(env);
  return env['NODE_ENV'] === 'production' ? 'production' : declared;
}
