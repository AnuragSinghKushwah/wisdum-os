import { ValidationError } from '@wisdum/errors';
import type { TenantId } from '@wisdum/types';
import type { FastifyRequest } from 'fastify';

const TENANT_HEADER = 'x-tenant-id';

/** Every request is tenant-scoped; the tenant travels as a header until auth issues real sessions. */
export function requireTenantId(request: FastifyRequest): TenantId {
  const header = request.headers[TENANT_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  if (value === undefined || value.length === 0) {
    throw new ValidationError(`Missing required '${TENANT_HEADER}' header`);
  }
  return value as TenantId;
}
