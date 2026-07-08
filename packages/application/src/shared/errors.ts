import { DomainError } from '@wisdum/errors';

/** Raised when a command or query references an aggregate that does not exist. */
export class NotFoundError extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('not_found', message, details);
  }
}

/** Raised when a command would violate a uniqueness constraint (slug, email, name). */
export class ConflictError extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('conflict', message, details);
  }
}

/** Raised when credentials or a bearer token fail to authenticate a request. */
export class AuthenticationError extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('authentication_error', message, details);
  }
}
