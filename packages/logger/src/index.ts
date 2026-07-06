/**
 * Structured logging for the Wisdum platform.
 *
 * The `Logger` interface is the stable API; the JSON-lines console transport
 * is intentionally minimal and will be joined by richer transports when
 * observability infrastructure is introduced.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Structured context attached to log lines. */
export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** Returns a logger that includes `fields` on every line. */
  child(fields: LogFields): Logger;
}

function emit(
  level: LogLevel,
  name: string,
  base: LogFields,
  message: string,
  fields?: LogFields,
): void {
  const line = JSON.stringify({
    level,
    logger: name,
    time: new Date().toISOString(),
    message,
    ...base,
    ...fields,
  });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Create a named JSON-lines logger writing to the console. */
export function createLogger(name: string, base: LogFields = {}): Logger {
  return {
    debug: (message, fields) => emit('debug', name, base, message, fields),
    info: (message, fields) => emit('info', name, base, message, fields),
    warn: (message, fields) => emit('warn', name, base, message, fields),
    error: (message, fields) => emit('error', name, base, message, fields),
    child: (fields) => createLogger(name, { ...base, ...fields }),
  };
}
