export const createWorkspaceBodySchema = {
  type: 'object',
  required: ['organizationId', 'name', 'createdBy'],
  properties: {
    organizationId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    createdBy: { type: 'string', format: 'uuid' },
  },
  additionalProperties: false,
} as const;

export const addWorkspaceMemberBodySchema = {
  type: 'object',
  required: ['userId', 'role'],
  properties: {
    userId: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['owner', 'admin', 'member', 'guest'] },
  },
  additionalProperties: false,
} as const;

export const workspaceIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;
