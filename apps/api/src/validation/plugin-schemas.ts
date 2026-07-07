export const installPluginBodySchema = {
  type: 'object',
  required: ['pluginName', 'version', 'displayName', 'description'],
  properties: {
    pluginName: { type: 'string' },
    version: { type: 'string' },
    displayName: { type: 'string' },
    description: { type: 'string' },
    capabilities: { type: 'array', items: { type: 'string' } },
    permissions: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

export const pluginIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;
