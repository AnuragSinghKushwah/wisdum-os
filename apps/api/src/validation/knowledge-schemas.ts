export const createKnowledgeBodySchema = {
  type: 'object',
  required: ['title', 'type', 'visibility', 'sourceKind'],
  properties: {
    title: { type: 'string', minLength: 1 },
    type: { type: 'string' },
    visibility: { type: 'string' },
    sourceKind: { type: 'string' },
    sourceUri: { type: 'string' },
    description: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

export const knowledgeIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;
