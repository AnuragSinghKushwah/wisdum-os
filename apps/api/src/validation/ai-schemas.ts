export const startConversationBodySchema = {
  type: 'object',
  required: ['provider', 'modelName', 'ownerId'],
  properties: {
    provider: { type: 'string' },
    modelName: { type: 'string' },
    ownerId: { type: 'string' },
    title: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const appendMessageBodySchema = {
  type: 'object',
  required: ['role', 'content'],
  properties: {
    role: { type: 'string', enum: ['system', 'user', 'assistant', 'tool'] },
    content: { type: 'string' },
    inputTokens: { type: 'number' },
    outputTokens: { type: 'number' },
  },
  additionalProperties: false,
} as const;

export const conversationIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const runTurnBodySchema = {
  type: 'object',
  required: ['userMessage'],
  properties: {
    userMessage: { type: 'string' },
    systemPrompt: { type: 'string' },
    maxContextTokens: { type: 'number' },
  },
  additionalProperties: false,
} as const;
