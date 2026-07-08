import { ValidationError } from '@wisdum/errors';
import type { TenantId } from '@wisdum/types';
import type { FastifyRequest } from 'fastify';

const TENANT_HEADER = 'x-tenant-id';

/**
 * Resolves the tenant a request acts within. Once a request carries a
 * verified bearer token (see `auth-context.ts`), the tenant travels inside
 * the token and the header is ignored — a caller cannot use the header to
 * spoof a different tenant than the one their token was issued for.
 * Pre-authentication routes (login, signup) still rely on the header.
 */
export function requireTenantId(request: FastifyRequest): TenantId {
  if (request.principal !== undefined) {
    return request.principal.tenantId;
  }
  const header = request.headers[TENANT_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  if (value === undefined || value.length === 0) {
    throw new ValidationError(`Missing required '${TENANT_HEADER}' header`);
  }
  return value as TenantId;
}
