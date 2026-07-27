import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerHealthRoutes } from '../health-routes.js';

describe('Health & Metrics Routes', () => {
  it('GET /healthz returns 200 OK with uptime and status', async () => {
    const app = Fastify();
    await registerHealthRoutes(app);

    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('wisdum-api');
  });

  it('GET /readyz returns 200 OK with database and redis readiness', async () => {
    const app = Fastify();
    await registerHealthRoutes(app);

    const res = await app.inject({
      method: 'GET',
      url: '/readyz',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ready');
    expect(body.database).toBe('connected');
  });

  it('GET /metrics returns Prometheus formatted plain text', async () => {
    const app = Fastify();
    await registerHealthRoutes(app);

    const res = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.payload).toContain('wisdum_requests_total');
    expect(res.payload).toContain('wisdum_uptime_seconds');
  });
});
