/**
 * A typed injection token. The phantom type parameter ties a token to the
 * service type it resolves to, so `container.resolve(token)` is fully typed
 * without casts at call sites.
 */
export interface Token<T> {
  readonly key: symbol;
  readonly description: string;
  /** Phantom — never assigned; carries T through the type system. */
  readonly __type?: T;
}

/** Create a unique injection token. Two tokens never collide, even with equal descriptions. */
export function createToken<T>(description: string): Token<T> {
  return Object.freeze({ key: Symbol(description), description });
}
