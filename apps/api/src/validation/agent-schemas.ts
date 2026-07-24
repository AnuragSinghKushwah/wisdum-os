export const createAgentTaskBodySchema = {
  type: 'object',
  required: ['agentType', 'payload'],
  properties: {
    agentType: { type: 'string', enum: ['writing', 'publishing'] },
    payload: { type: 'object' },
  },
  additionalProperties: false,
} as const;
