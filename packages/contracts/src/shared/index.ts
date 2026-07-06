import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';

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
