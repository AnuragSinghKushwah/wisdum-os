export const createDocumentBodySchema = {
  type: 'object',
  required: ['content', 'mimeType', 'encoding'],
  properties: {
    content: { type: 'string' },
    mimeType: { type: 'string' },
    encoding: { type: 'string' },
    language: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const replaceDocumentContentBodySchema = {
  type: 'object',
  required: ['content', 'encoding'],
  properties: {
    content: { type: 'string' },
    encoding: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const documentIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;
