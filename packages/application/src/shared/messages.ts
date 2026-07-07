/**
 * CQRS message contracts. Commands mutate state through one aggregate;
 * queries read projections. Handlers are the only entry points into the
 * application layer — HTTP, jobs, and events all dispatch through them.
 */

/** Marker for messages that request a state change. */
export interface Command {
  readonly kind: 'command';
}

/** Marker for messages that request data without side effects. */
export interface Query {
  readonly kind: 'query';
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

export interface QueryHandler<TQuery extends Query, TResult> {
  execute(query: TQuery): Promise<TResult>;
}
