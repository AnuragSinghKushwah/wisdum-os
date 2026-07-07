import { getEnvironment, optionalEnv } from '@wisdum/config';
import { createLogger } from '@wisdum/logger';
import { buildServer } from './index.js';

const logger = createLogger('api');

async function main(): Promise<void> {
  const { app, kernel } = await buildServer();
  const port = Number(optionalEnv('PORT', '3001'));

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void (async () => {
        await kernel.stop();
        await app.close();
        process.exit(0);
      })();
    });
  }

  await app.listen({ port, host: '0.0.0.0' });
  logger.info('Wisdum API listening', { environment: getEnvironment(), port });
}

main().catch((error: unknown) => {
  logger.error('Wisdum API failed to start', {
    error: error instanceof Error ? error.message : error,
  });
  process.exit(1);
});
