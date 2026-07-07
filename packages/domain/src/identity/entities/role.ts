import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { PermissionName } from '../value-objects/permission-name.js';
import type { RoleId } from '../value-objects/identity-ids.js';
import type { RoleName } from '../value-objects/role-name.js';
import {
  IDENTITY_EVENT_SCHEMA_VERSION,
  PERMISSION_GRANTED,
  PERMISSION_REVOKED,
} from '../events/identity-events.js';
import type { AnyIdentityEvent } from '../events/identity-events.js';

/** What callers provide to create a new role. */
export interface CreateRoleProps {
  readonly id: RoleId;
  readonly tenantId: TenantId;
  readonly name: RoleName;
  readonly description: string;
  /** System roles ship with the platform and cannot be modified by tenants. */
  readonly isSystem?: boolean;
}

/** Full state needed to rehydrate an existing role (no events are raised). */
export interface RoleSnapshot {
  readonly id: RoleId;
  readonly tenantId: TenantId;
  readonly name: RoleName;
  readonly description: string;
  readonly isSystem: boolean;
  readonly permissions: readonly PermissionName[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * A named bundle of permissions. Users hold roles; roles hold permissions —
 * authorization is always resolved through this indirection so grants stay
 * auditable and revocable in one place.
 */
export class Role extends AggregateRoot<RoleId> {
  private readonly _tenantId: TenantId;
  private readonly _name: RoleName;
  private _description: string;
  private readonly _isSystem: boolean;
  private readonly _permissions: PermissionName[];
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: RoleSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._name = snapshot.name;
    this._description = snapshot.description;
    this._isSystem = snapshot.isSystem;
    this._permissions = [...snapshot.permissions];
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  static create(props: CreateRoleProps, clock: Clock): Role {
    const now = clock.now();
    return new Role({
      id: props.id,
      tenantId: props.tenantId,
      name: props.name,
      description: props.description,
      isSystem: props.isSystem ?? false,
      permissions: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Rehydrate an existing role from persisted state. Raises no events. */
  static reconstitute(snapshot: RoleSnapshot): Role {
    return new Role(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Grant a permission to the role. Idempotent. */
  grantPermission(permission: PermissionName, clock: Clock): void {
    this.ensureMutable();
    if (this.hasPermission(permission)) return;
    const now = clock.now();
    this._permissions.push(permission);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: PERMISSION_GRANTED,
      payload: { roleId: this.id.value(), permission: permission.value },
    });
  }

  /** Remove a permission from the role. Idempotent. */
  revokePermission(permission: PermissionName, clock: Clock): void {
    this.ensureMutable();
    const index = this._permissions.findIndex((existing) => existing.equals(permission));
    if (index === -1) return;
    const now = clock.now();
    this._permissions.splice(index, 1);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: PERMISSION_REVOKED,
      payload: { roleId: this.id.value(), permission: permission.value },
    });
  }

  describe(description: string, clock: Clock): void {
    this.ensureMutable();
    if (this._description === description) return;
    this._description = description;
    this.touch(clock.now());
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): RoleName {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get isSystem(): boolean {
    return this._isSystem;
  }

  get permissions(): readonly PermissionName[] {
    return Object.freeze([...this._permissions]);
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  /** Exact-match check; wildcard resolution is `allows`. */
  hasPermission(permission: PermissionName): boolean {
    return this._permissions.some((existing) => existing.equals(permission));
  }

  /** Whether any held permission (including wildcards) covers the requested one. */
  allows(requested: PermissionName): boolean {
    return this._permissions.some((existing) => existing.covers(requested));
  }

  // ── Invariant enforcement ──────────────────────────────────────────────

  private ensureMutable(): void {
    if (this._isSystem) {
      throw new InvariantViolationError('System roles cannot be modified', {
        roleId: this.id.value(),
        role: this._name.value,
      });
    }
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyIdentityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: RoleId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: IDENTITY_EVENT_SCHEMA_VERSION,
    };
  }
}
