export const createUserBodySchema = {
  type: 'object',
  required: ['email', 'displayName'],
  properties: {
    email: { type: 'string' },
    displayName: { type: 'string' },
    password: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const assignRoleBodySchema = {
  type: 'object',
  required: ['roleId'],
  properties: { roleId: { type: 'string' } },
  additionalProperties: false,
} as const;

export const userIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
} as const;

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string' },
    password: { type: 'string' },
  },
  additionalProperties: false,
} as const;
