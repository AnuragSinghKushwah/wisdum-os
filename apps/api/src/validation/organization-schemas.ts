export const createOrganizationBodySchema = {
  type: 'object',
  required: ['name'],
  properties: { name: { type: 'string' } },
  additionalProperties: false,
} as const;

export const attachWorkspaceBodySchema = {
  type: 'object',
  required: ['workspaceId'],
  properties: { workspaceId: { type: 'string', format: 'uuid' } },
  additionalProperties: false,
} as const;

export const organizationIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;
