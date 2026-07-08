export const createSearchIndexBodySchema = {
  type: 'object',
  required: ['name', 'mode'],
  properties: {
    name: { type: 'string' },
    mode: { type: 'string', enum: ['keyword', 'semantic', 'hybrid'] },
  },
  additionalProperties: false,
} as const;

export const searchIndexIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const searchQuerySchema = {
  type: 'object',
  required: ['text'],
  properties: {
    text: { type: 'string' },
    mode: { type: 'string', enum: ['keyword', 'semantic', 'hybrid'] },
    limit: { type: 'number' },
    offset: { type: 'number' },
  },
} as const;

export const indexSearchDocumentBodySchema = {
  type: 'object',
  required: ['sourceId', 'sourceType', 'text'],
  properties: {
    sourceId: { type: 'string' },
    sourceType: { type: 'string', enum: ['knowledge', 'document', 'conversation'] },
    text: { type: 'string' },
    chunkCount: { type: 'number' },
  },
  additionalProperties: false,
} as const;
