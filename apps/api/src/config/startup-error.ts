interface NetworkErrorLike {
  readonly code?: string;
  readonly address?: string;
  readonly port?: number;
  readonly message?: string;
}

/**
 * Turns whatever the API failed to start with into a message a person can act on.
 *
 * Node reports a refused connection to `localhost` as an `AggregateError` with
 * an empty message (one failure for IPv6, one for IPv4), which logs as a blank
 * string. The most common cause is a `DATABASE_URL` or `REDIS_URL` from `.env`
 * pointing at services that are not running, so the hint says how to fix that.
 */
export function describeStartupError(error: unknown, environment: NodeJS.ProcessEnv): string {
  const causes: readonly unknown[] = error instanceof AggregateError ? error.errors : [error];
  const refused = causes.find(
    (cause): cause is NetworkErrorLike =>
      typeof cause === 'object' &&
      cause !== null &&
      (cause as NetworkErrorLike).code === 'ECONNREFUSED',
  );

  if (refused !== undefined) {
    const target =
      refused.address !== undefined && refused.port !== undefined
        ? `${refused.address}:${refused.port}`
        : 'a configured service';
    const configured = ['DATABASE_URL', 'REDIS_URL'].filter(
      (name) => (environment[name] ?? '').length > 0,
    );
    const hint =
      configured.length > 0
        ? ` ${configured.join(' and ')} ${configured.length > 1 ? 'are' : 'is'} set (check .env). ` +
          'Start the services with "npm run docker:up", or clear the variable to run in memory.'
        : '';
    return `Could not connect to ${target}: connection refused.${hint}`;
  }

  const message = causes
    .map((cause) => (cause instanceof Error ? cause.message : String(cause)))
    .find((text) => text.length > 0);
  return message ?? 'Unknown error (no message was provided).';
}
