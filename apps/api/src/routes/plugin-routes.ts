import {
  disablePluginCommand,
  enablePluginCommand,
  getPluginQuery,
  installPluginCommand,
  listPluginsQuery,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { PluginHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import { installPluginBodySchema, pluginIdParamsSchema } from '../validation/plugin-schemas.js';

interface InstallPluginBody {
  readonly pluginName: string;
  readonly version: string;
  readonly displayName: string;
  readonly description: string;
  readonly capabilities?: readonly string[];
  readonly permissions?: readonly string[];
}

export function registerPluginRoutes(app: FastifyInstance, handlers: PluginHandlers): void {
  app.get('/v1/plugins', async (request) => {
    const tenantId = requireTenantId(request);
    return handlers.list.execute(listPluginsQuery({ tenantId }));
  });

  app.post('/v1/plugins', { schema: { body: installPluginBodySchema } }, async (request, reply) => {
    const tenantId = requireTenantId(request);
    const body = request.body as InstallPluginBody;
    const result = await handlers.install.execute(
      installPluginCommand({
        tenantId,
        capabilities: [],
        permissions: [],
        ...body,
      }),
    );
    await reply.status(201).send(result);
  });

  app.get('/v1/plugins/:id', { schema: { params: pluginIdParamsSchema } }, async (request) => {
    const { id } = request.params as { id: string };
    return handlers.get.execute(getPluginQuery({ pluginId: id }));
  });

  app.post(
    '/v1/plugins/:id/enable',
    { schema: { params: pluginIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      await handlers.enable.execute(enablePluginCommand({ pluginId: id }));
      return { status: 'enabled' };
    },
  );

  app.post(
    '/v1/plugins/:id/disable',
    { schema: { params: pluginIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      await handlers.disable.execute(disablePluginCommand({ pluginId: id }));
      return { status: 'disabled' };
    },
  );
}
