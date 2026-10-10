export const opportunityIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const draftIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const publishedContentIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const updateContentDraftBodySchema = {
  type: 'object',
  required: ['title', 'body'],
  properties: {
    title: { type: 'string', minLength: 1 },
    body: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const generateFromKnowledgeParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const generateFromKnowledgeBodySchema = {
  type: 'object',
  required: ['platforms'],
  properties: {
    platforms: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    instructions: { type: 'string', maxLength: 2000 },
  },
  additionalProperties: false,
} as const;
