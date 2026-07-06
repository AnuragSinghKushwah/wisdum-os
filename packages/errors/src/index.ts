/**
 * Base error hierarchy for the Wisdum platform.
 *
 * Error codes are machine-readable `snake_case` identifiers and surface
 * unchanged in the API error envelope (see docs/api/README.md).
 */
export class WisdumError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

/** Raised when required configuration is missing or malformed. */
export class ConfigurationError extends WisdumError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('configuration_error', message, details);
  }
}

/** Narrow an unknown thrown value to the platform error hierarchy. */
export function isWisdumError(value: unknown): value is WisdumError {
  return value instanceof WisdumError;
}
