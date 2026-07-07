/**
 * Foundational types shared across the Wisdum platform.
 *
 * Everything here is dependency-free and domain-agnostic; anything
 * application-specific belongs in `@wisdum/domain` or `@wisdum/contracts`.
 */

/** Nominal typing helper: a `Brand<string, 'TenantId'>` is not assignable from a plain string. */
export type Brand<T, Tag extends string> = T & { readonly __brand: Tag };

/** RFC 4122 UUID string. */
export type UUID = Brand<string, 'UUID'>;

/** Identifies the tenant a record or operation is scoped to. */
export type TenantId = Brand<string, 'TenantId'>;

/** ISO-8601 timestamp string in UTC. */
export type IsoTimestamp = Brand<string, 'IsoTimestamp'>;

/** Explicit success-or-failure value for passing errors across package boundaries. */
export type Result<T, E = Error> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * A value that may be absent, for interop at boundaries (JSON, external APIs).
 * Prefer `Option` in domain signatures, where absence is part of the model.
 */
export type Maybe<T> = T | null | undefined;

/** Explicit presence or absence of a value, without null. */
export type Option<T> = { readonly some: true; readonly value: T } | { readonly some: false };

export function some<T>(value: T): Option<T> {
  return { some: true, value };
}

export const none: Option<never> = Object.freeze({ some: false });

/**
 * A value of one of two possible types. By convention `left` carries the
 * failure or alternate case and `right` carries the success case.
 */
export type Either<L, R> =
  { readonly kind: 'left'; readonly value: L } | { readonly kind: 'right'; readonly value: R };

export function left<L>(value: L): Either<L, never> {
  return { kind: 'left', value };
}

export function right<R>(value: R): Either<never, R> {
  return { kind: 'right', value };
}
