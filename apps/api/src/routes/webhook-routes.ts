import type { FastifyInstance } from 'fastify';
import { ingestWebhookCommand } from '@wisdum/application';
import type { CaptureHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import { ingestWebhookBodySchema } from '../validation/webhook-schemas.js';

export function registerWebhookRoutes(app: FastifyInstance, handlers: CaptureHandlers): void {
  app.post(
    '/v1/webhooks/ingest',
    { schema: { body: ingestWebhookBodySchema } },
    async (request, reply) => {
      // The caller was authenticated by the global auth hook; the tenant comes from
      // the credential itself, never from a header the caller controls.
      const tenantId = requireTenantId(request);

      // Extract the body
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

      // Execute the ingestion command
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
