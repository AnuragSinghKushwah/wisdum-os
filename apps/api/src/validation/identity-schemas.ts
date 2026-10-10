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

export const resolveTenantBodySchema = {
  type: 'object',
  required: ['email'],
  properties: { email: { type: 'string' } },
  additionalProperties: false,
} as const;

export const onboardingBodySchema = {
  type: 'object',
  required: ['orgName', 'orgSlug', 'displayName', 'email', 'password'],
  properties: {
    orgName: { type: 'string', minLength: 1, maxLength: 120 },
    orgSlug: { type: 'string', minLength: 1, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
    displayName: { type: 'string', minLength: 1, maxLength: 120 },
    email: { type: 'string' },
    password: { type: 'string', minLength: 8, maxLength: 256 },
  },
  additionalProperties: false,
} as const;

export const createApiKeyBodySchema = {
  type: 'object',
  required: ['label', 'scopes'],
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 100 },
    scopes: { type: 'array', minItems: 1, maxItems: 64, items: { type: 'string' } },
  },
  additionalProperties: false,
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
