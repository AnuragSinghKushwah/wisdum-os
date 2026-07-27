export const getEventStreamQuerySchema = {
  type: 'object',
  properties: {
    events: { type: 'string' },
    once: { type: 'string' },
  },
} as const;

