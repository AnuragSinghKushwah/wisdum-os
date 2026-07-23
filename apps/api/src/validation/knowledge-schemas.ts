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

export const updateKnowledgeBodySchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

export const changeKnowledgeVisibilityBodySchema = {
  type: 'object',
  required: ['visibility'],
  properties: {
    visibility: { type: 'string', enum: ['private', 'workspace', 'public'] },
  },
  additionalProperties: false,
} as const;

export const importKnowledgeBodySchema = {
  type: 'object',
  required: ['sourceKind'],
  properties: {
    sourceKind: { type: 'string', minLength: 1 },
    sourceUri: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const knowledgeIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const attachKnowledgeContentBodySchema = {
  type: 'object',
  required: ['reference'],
  properties: {
    reference: { type: 'string', minLength: 1 },
    mimeType: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const createWebhookKnowledgeBodySchema = {
  type: 'object',
  required: ['title', 'type'],
  properties: {
    title: { type: 'string', minLength: 1 },
    type: { type: 'string' },
    content: { type: 'string' },
    visibility: { type: 'string' },
    description: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;
