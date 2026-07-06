/**
 * Composition root for the Wisdum API application.
 * Wires shared infrastructure only — business logic lives in packages/domain.
 */
import { getEnvironment } from '@wisdum/config';
import { createLogger } from '@wisdum/logger';

export function bootstrap(): void {
  const logger = createLogger('api');
  logger.info('Wisdum API skeleton ready', { environment: getEnvironment() });
}
