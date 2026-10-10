import type { FastifyInstance } from 'fastify';
import type { LlmStatus } from '../container/tokens.js';

/**
 * What this deployment can do, for signed-in clients. Lets the web app say so
 * when no AI provider is configured instead of presenting canned sample text as real output.
 */
export function registerSystemRoutes(app: FastifyInstance, llm: LlmStatus): void {
  app.get('/v1/system/capabilities', async () => ({
    ai: llm.mode === 'live' ? { mode: 'live', provider: llm.provider } : { mode: 'mock' },
  }));
}
