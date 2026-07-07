import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { ServiceAccountStatusValue } from '../types/identity-types.js';
import type { DisplayName } from '../value-objects/display-name.js';
import type { RoleId, ServiceAccountId } from '../value-objects/identity-ids.js';
import {
  IDENTITY_EVENT_SCHEMA_VERSION,
  SERVICE_ACCOUNT_CREATED,
  SERVICE_ACCOUNT_DISABLED,
  SERVICE_ACCOUNT_ENABLED,
} from '../events/identity-events.js';
import type { AnyIdentityEvent } from '../events/identity-events.js';

/** What callers provide to create a new service account. */
export interface CreateServiceAccountProps {
  readonly id: ServiceAccountId;
  readonly tenantId: TenantId;
  readonly displayName: DisplayName;
  readonly description: string;
}

/** Full state needed to rehydrate a service account (no events are raised). */
export interface ServiceAccountSnapshot {
  readonly id: ServiceAccountId;
  readonly tenantId: TenantId;
  readonly displayName: DisplayName;
  readonly description: string;
  readonly status: ServiceAccountStatusValue;
  readonly roleIds: readonly RoleId[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * A non-human actor: integrations, automations, and plugins authenticate as
 * service accounts. They hold roles like users but have no credentials of
 * their own — access always flows through API keys minted against them.
 * Disabling is reversible and instantly cuts off every key.
 */
export class ServiceAccount extends AggregateRoot<ServiceAccountId> {
  private readonly _tenantId: TenantId;
  private _displayName: DisplayName;
  private _description: string;
  private _status: ServiceAccountStatusValue;
  private readonly _roleIds: RoleId[];
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: ServiceAccountSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._displayName = snapshot.displayName;
    this._description = snapshot.description;
    this._status = snapshot.status;
    this._roleIds = [...snapshot.roleIds];
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Create a new enabled service account and raise ServiceAccountCreated. */
  static create(props: CreateServiceAccountProps, clock: Clock): ServiceAccount {
    const now = clock.now();
    const account = new ServiceAccount({
      id: props.id,
      tenantId: props.tenantId,
      displayName: props.displayName,
      description: props.description,
      status: 'enabled',
      roleIds: [],
      createdAt: now,
      updatedAt: now,
    });
    account.raise({
      ...account.eventEnvelope(now),
      eventType: SERVICE_ACCOUNT_CREATED,
      payload: {
        serviceAccountId: props.id.value(),
        displayName: props.displayName.value,
      },
    });
    return account;
  }

  /** Rehydrate an existing service account from persisted state. */
  static reconstitute(snapshot: ServiceAccountSnapshot): ServiceAccount {
    return new ServiceAccount(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Assign a role. Idempotent. */
  assignRole(roleId: RoleId, clock: Clock): void {
    if (this.hasRole(roleId)) return;
    this._roleIds.push(roleId);
    this.touch(clock.now());
  }

  /** Remove a role. Idempotent. */
  revokeRole(roleId: RoleId, clock: Clock): void {
    const index = this._roleIds.findIndex((existing) => existing.equals(roleId));
    if (index === -1) return;
    this._roleIds.splice(index, 1);
    this.touch(clock.now());
  }

  rename(displayName: DisplayName, clock: Clock): void {
    if (this._displayName.equals(displayName)) return;
    this._displayName = displayName;
    this.touch(clock.now());
  }

  describe(description: string, clock: Clock): void {
    if (this._description === description) return;
    this._description = description;
    this.touch(clock.now());
  }

  /** Disable the account, cutting off all access. Idempotent. */
  disable(clock: Clock): void {
    if (this._status === 'disabled') return;
    const now = clock.now();
    this._status = 'disabled';
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SERVICE_ACCOUNT_DISABLED,
      payload: { serviceAccountId: this.id.value() },
    });
  }

  /** Re-enable a disabled account. Idempotent. */
  enable(clock: Clock): void {
    if (this._status === 'enabled') return;
    const now = clock.now();
    this._status = 'enabled';
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: SERVICE_ACCOUNT_ENABLED,
      payload: { serviceAccountId: this.id.value() },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get displayName(): DisplayName {
    return this._displayName;
  }

  get description(): string {
    return this._description;
  }

  get status(): ServiceAccountStatusValue {
    return this._status;
  }

  get roleIds(): readonly RoleId[] {
    return Object.freeze([...this._roleIds]);
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  hasRole(roleId: RoleId): boolean {
    return this._roleIds.some((existing) => existing.equals(roleId));
  }

  isEnabled(): boolean {
    return this._status === 'enabled';
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyIdentityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: ServiceAccountId;
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
