import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { PermissionId } from '../value-objects/identity-ids.js';
import type { PermissionName } from '../value-objects/permission-name.js';

/** What callers provide to register a permission. */
export interface CreatePermissionProps {
  readonly id: PermissionId;
  readonly tenantId: TenantId;
  readonly name: PermissionName;
  readonly description: string;
}

/** Full state needed to rehydrate a permission (no events are raised). */
export interface PermissionSnapshot {
  readonly id: PermissionId;
  readonly tenantId: TenantId;
  readonly name: PermissionName;
  readonly description: string;
  readonly createdAt: IsoTimestamp;
}

/**
 * A registered permission in the platform catalog. Permissions are the
 * vocabulary of authorization: bounded contexts and plugins declare them;
 * roles reference them by name. Effectively immutable after registration —
 * renaming a permission is a new permission.
 */
export class Permission extends AggregateRoot<PermissionId> {
  private readonly _tenantId: TenantId;
  private readonly _name: PermissionName;
  private readonly _description: string;
  private readonly _createdAt: IsoTimestamp;

  private constructor(snapshot: PermissionSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._name = snapshot.name;
    this._description = snapshot.description;
    this._createdAt = snapshot.createdAt;
  }

  static create(props: CreatePermissionProps, clock: Clock): Permission {
    return new Permission({
      id: props.id,
      tenantId: props.tenantId,
      name: props.name,
      description: props.description,
      createdAt: clock.now(),
    });
  }

  /** Rehydrate an existing permission from persisted state. */
  static reconstitute(snapshot: PermissionSnapshot): Permission {
    return new Permission(snapshot);
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): PermissionName {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }
}
