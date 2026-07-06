/**
 * REST contracts shared by every Wisdum API.
 * These mirror the standards in docs/api/README.md.
 */

/** Uniform error envelope returned by all endpoints. */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

/** Cursor-based pagination parameters accepted by list endpoints. */
export interface CursorQuery {
  readonly cursor?: string;
  readonly limit?: number;
}

/** Cursor-paginated response wrapper. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}
