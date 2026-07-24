import type { FastifyInstance } from 'fastify';
import { optionalEnv } from '@wisdum/config';
import type { TenantId } from '@wisdum/types';
import { AuthenticationError, ingestWebhookCommand } from '@wisdum/application';
import type { CaptureHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import { ingestWebhookBodySchema } from '../validation/webhook-schemas.js';

export function registerWebhookRoutes(app: FastifyInstance, handlers: CaptureHandlers): void {
  app.post(
    '/v1/webhooks/ingest',
    { schema: { body: ingestWebhookBodySchema } },
    async (request, reply) => {
      // 1. Verify API Key
      const apiKeyHeader = request.headers['x-api-key'];
      const expectedKey = optionalEnv('WISDUM_API_KEY', 'dev-webhook-key');

      if (typeof apiKeyHeader !== 'string' || apiKeyHeader !== expectedKey) {
        throw new AuthenticationError('Invalid API Key for webhook ingestion.', {
          provided: typeof apiKeyHeader === 'string' ? '***' : 'missing',
        });
      }

      // 2. Resolve Tenant Context
      const tenantIdHeader = request.headers['x-tenant-id'];
      const tenantId = (
        typeof tenantIdHeader === 'string' && tenantIdHeader.trim().length > 0
          ? tenantIdHeader
          : requireTenantId(request)
      ) as TenantId;

      // 3. Extract Body
      const {
        source,
        title,
        content,
        contentType,
        sourceUri,
        labels,
        triggerReasoningPass,
      } = request.body as {
        source: string;
        title: string;
        content: string;
        contentType?: string;
        sourceUri?: string;
        labels?: readonly string[];
        triggerReasoningPass?: boolean;
      };

      // 4. Execute Ingestion Command
      const result = await handlers.ingestWebhook.execute(
        ingestWebhookCommand({
          tenantId,
          source,
          title,
          content,
          contentType,
          sourceUri,
          labels,
          triggerReasoningPass,
        }),
      );

      const status = result.status === 'created' ? 201 : 200;
      return reply.status(status).send(result);
    },
  );
}
