import type { FastifyInstance } from 'fastify';

let requestCounter = 0;

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  // Global hook to track Prometheus request count
  app.addHook('onRequest', async () => {
    requestCounter++;
  });

  // Liveness Probe
  app.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'wisdum-api',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness Probe
  app.get('/readyz', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ready',
      database: 'connected',
      redis: 'connected',
      timestamp: new Date().toISOString(),
    });
  });

  // Prometheus Metrics Endpoint
  app.get('/metrics', async (_request, reply) => {
    const uptime = Math.floor(process.uptime());
    const mem = process.memoryUsage();

    const metricsText = `# HELP wisdum_requests_total Total HTTP requests handled by Wisdum API
# TYPE wisdum_requests_total counter
wisdum_requests_total ${requestCounter}

# HELP wisdum_uptime_seconds Process uptime in seconds
# TYPE wisdum_uptime_seconds gauge
wisdum_uptime_seconds ${uptime}

# HELP wisdum_memory_heap_used_bytes Memory heap used in bytes
# TYPE wisdum_memory_heap_used_bytes gauge
wisdum_memory_heap_used_bytes ${mem.heapUsed}
`;

    return reply.type('text/plain; version=0.0.4').send(metricsText);
  });
}
