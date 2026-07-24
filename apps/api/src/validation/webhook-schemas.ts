export const ingestWebhookBodySchema = {
  type: 'object',
  required: ['source', 'title', 'content'],
  properties: {
    source: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    content: { type: 'string', minLength: 1 },
    contentType: { type: 'string' },
    sourceUri: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
    triggerReasoningPass: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;
