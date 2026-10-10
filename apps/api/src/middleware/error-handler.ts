import { isWisdumError } from '@wisdum/errors';
import { createLogger } from '@wisdum/logger';
import type { FastifyReply, FastifyRequest } from 'fastify';

const logger = createLogger('api-error-handler');

const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  validation_error: 400,
  authentication_error: 401,
  authorization_error: 403,
  not_found: 404,
  conflict: 409,
  invariant_violation: 422,
  plugin_disabled: 403,
  configuration_error: 503,
};

/**
 * Maps domain and application errors to HTTP status codes. Every
 * `WisdumError` carries a machine-readable `code`, which is what the API
 * error envelope surfaces unchanged (see docs/api/README.md).
 */
export function errorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply): void {
  if (isWisdumError(error)) {
    const status = STATUS_BY_CODE[error.code] ?? 500;
    if (status >= 500) {
      logger.error('Unhandled domain error', { method: request.method, url: request.url, error });
    }
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
  // Fastify's own client errors (a malformed or empty body, an unsupported media type) carry a 4xx status.
  if (error instanceof Error && 'statusCode' in error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      reply.status(status).send({ error: { code: 'bad_request', message: error.message } });
      return;
    }
  }
  logger.error('Unexpected error', {
    method: request.method,
    url: request.url,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
  reply
    .status(500)
    .send({ error: { code: 'internal_error', message: 'An unexpected error occurred' } });
}
