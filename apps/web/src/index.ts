/**
 * Composition root for the Wisdum web application — a client of the platform
 * APIs with no privileged access. The UI framework scaffold (Next.js per
 * ADR 0003) replaces this placeholder without changing the package boundary.
 */
import { getEnvironment } from '@wisdum/config';
import { createLogger } from '@wisdum/logger';

export function bootstrap(): void {
  const logger = createLogger('web');
  logger.info('Wisdum web skeleton ready', { environment: getEnvironment() });
}
