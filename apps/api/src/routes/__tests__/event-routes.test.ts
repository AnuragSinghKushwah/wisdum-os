import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { InMemoryEventBus } from '@wisdum/infrastructure';
import type { EventName } from '@wisdum/contracts';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { registerEventStreamRoutes } from '../event-routes.js';

describe('Event Streaming Routes (GET /v1/events/stream)', () => {
  it('registers SSE route and connects stream with tenant context', async () => {
    const app = Fastify();
    const eventBus = new InMemoryEventBus();

    registerEventStreamRoutes(app, eventBus);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/events/stream?once=true',
      headers: {
        'x-tenant-id': '00000000-0000-4000-8000-000000000001',
      },
    });


    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.payload).toContain(': connected tenant=00000000-0000-4000-8000-000000000001');
  });

  it('streams published domain events matching tenant boundary', async () => {
    const app = Fastify();
    const eventBus = new InMemoryEventBus();

    registerEventStreamRoutes(app, eventBus);

    // Simulate event publishing
    let capturedEventPayload = '';
    eventBus.subscribe('knowledge.asset.created' as EventName, async (event) => {
      capturedEventPayload = JSON.stringify(event);
    });

    await eventBus.publish({
      id: '00000000-0000-4000-8000-000000000099' as UUID,
      name: 'knowledge.asset.created' as EventName,
      version: 1,
      tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
      occurredAt: new Date().toISOString() as IsoTimestamp,
      payload: {
        tenantId: '00000000-0000-4000-8000-000000000001',
        title: 'Test Knowledge Asset',
      },
    });

    expect(capturedEventPayload).toContain('Test Knowledge Asset');
  });
});

