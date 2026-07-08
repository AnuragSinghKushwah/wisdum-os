import { isWisdumError } from '@wisdum/errors';
import type { FastifyReply, FastifyRequest } from 'fastify';

const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  validation_error: 400,
  authentication_error: 401,
  not_found: 404,
  conflict: 409,
  invariant_violation: 422,
  configuration_error: 500,
};

/**
 * Maps domain and application errors to HTTP status codes. Every
 * `WisdumError` carries a machine-readable `code`, which is what the API
 * error envelope surfaces unchanged (see docs/api/README.md).
 */
export function errorHandler(error: unknown, _request: FastifyRequest, reply: FastifyReply): void {
  if (isWisdumError(error)) {
    const status = STATUS_BY_CODE[error.code] ?? 500;
    reply
      .status(status)
      .send({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error instanceof Error && 'validation' in error) {
    // Fastify's own schema-validation error shape.
    reply.status(400).send({ error: { code: 'validation_error', message: error.message } });
    return;
  }
  reply
    .status(500)
    .send({ error: { code: 'internal_error', message: 'An unexpected error occurred' } });
}
