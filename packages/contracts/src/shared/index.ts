import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';

/** An entity addressable by a stable identifier. */
export interface Identified {
  readonly id: UUID;
}

/** Data or operations scoped to a single tenant — the platform default. */
export interface TenantScoped {
  readonly tenantId: TenantId;
}

/** Creation and modification audit timestamps. */
export interface Timestamped {
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Describes a capability package under `platform/`. */
export interface PlatformCapability {
  readonly name: string;
  readonly description: string;
}

/** Bulk operation result: succeeded (count), failed (errors), and total. */
export interface BulkOperationResult<T = unknown> {
  readonly succeeded: number;
  readonly failed: readonly BulkOperationError<T>[];
  readonly total: number;
}

/** Error from a single item in a bulk operation. */
export interface BulkOperationError<T = unknown> {
  readonly index: number;
  readonly code: string;
  readonly message: string;
  readonly value?: T;
}

/** Searchable entity — carries information for full-text indexing. */
export interface Searchable {
  readonly searchText: string;
  readonly searchScore?: number;
}

/** Versioned entity — enables optimistic locking and conflict detection. */
export interface Versioned {
  readonly version: number;
}

/** Soft-deletable entity — marked deleted, not removed from storage. */
export interface SoftDeletable {
  readonly deletedAt: Option<IsoTimestamp>;
}
