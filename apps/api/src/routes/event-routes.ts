import type { FastifyInstance } from 'fastify';
import type { EventBus, Event } from '@wisdum/events';
import type { EventName } from '@wisdum/contracts';
import { requireTenantId } from '../middleware/tenant-context.js';
import { getEventStreamQuerySchema } from '../validation/event-schemas.js';

const DEFAULT_STREAM_EVENTS: EventName[] = [
  'knowledge.asset.created' as EventName,
  'knowledge.asset.updated' as EventName,
  'knowledge.asset.archived' as EventName,
  'knowledge.asset.deleted' as EventName,
  'opportunity.proposed' as EventName,
  'opportunity.published' as EventName,
  'opportunity.dismissed' as EventName,
  'agent.task.created' as EventName,
  'agent.task.completed' as EventName,
  'agent.task.failed' as EventName,
  'document.created' as EventName,
];

export function registerEventStreamRoutes(app: FastifyInstance, eventBus: EventBus): void {
  app.get<{ Querystring: { events?: string; once?: string } }>(
    '/v1/events/stream',
    { schema: { querystring: getEventStreamQuerySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no');
      reply.raw.flushHeaders();

      // Send initial connection establishment frame
      reply.raw.write(`: connected tenant=${tenantId}\n\n`);

      if (request.query.once === 'true') {
        reply.raw.end();
        return;
      }


      const requestedEvents = request.query.events
        ? (request.query.events.split(',').map((s) => s.trim()) as EventName[])
        : DEFAULT_STREAM_EVENTS;

      const unsubscribers: (() => void)[] = [];

      for (const eventName of requestedEvents) {
        const unsub = eventBus.subscribe(eventName, async (event: Event) => {
          // Verify tenant boundary
          const eventTenantId = event.tenantId ?? (event.payload as Record<string, unknown>)?.tenantId ?? tenantId;
          if (eventTenantId !== tenantId) {
            return;
          }

          const id = event.id ?? String(Date.now());
          const dataFrame = JSON.stringify({
            id,
            name: event.name,
            version: event.version,
            occurredAt: event.occurredAt,
            payload: event.payload,
          });

          if (!reply.raw.writableEnded) {
            reply.raw.write(`id: ${id}\nevent: ${event.name}\ndata: ${dataFrame}\n\n`);
          }
        });


        unsubscribers.push(unsub);
      }

      // Heartbeat timer to keep SSE socket alive
      const heartbeat = setInterval(() => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(': ping\n\n');
        } else {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Clean up event bus subscriptions when client disconnects
      const cleanup = () => {
        clearInterval(heartbeat);
        for (const unsub of unsubscribers) {
          try {
            unsub();
          } catch {
            // Ignore clean up errors
          }
        }
      };

      request.raw.on('close', cleanup);
      request.raw.on('end', cleanup);
    },
  );
}
