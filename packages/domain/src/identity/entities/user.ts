import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { UserStatus } from '../value-objects/user-status.js';
import type { DisplayName } from '../value-objects/display-name.js';
import type { Email } from '../value-objects/email.js';
import type { PasswordHash } from '../value-objects/password-hash.js';
import type { RoleId, UserId } from '../value-objects/identity-ids.js';
import {
  IDENTITY_EVENT_SCHEMA_VERSION,
  ROLE_ASSIGNED,
  ROLE_REVOKED,
  USER_CREATED,
  USER_DELETED,
  USER_REACTIVATED,
  USER_SUSPENDED,
} from '../events/identity-events.js';
import type { AnyIdentityEvent } from '../events/identity-events.js';

/** What callers provide to create a new user. */
export interface CreateUserProps {
  readonly id: UserId;
  readonly tenantId: TenantId;
  readonly email: Email;
  readonly displayName: DisplayName;
  /** Absent for federated (SSO) users — local credentials are optional. */
  readonly passwordHash?: PasswordHash;
}

/** Full state needed to rehydrate an existing user (no events are raised). */
export interface UserSnapshot {
  readonly id: UserId;
  readonly tenantId: TenantId;
  readonly email: Email;
  readonly displayName: DisplayName;
  readonly passwordHash?: PasswordHash;
  readonly status: UserStatus;
  readonly roleIds: readonly RoleId[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Aggregate root of the Identity bounded context: a human actor on the
 * platform. A user owns its identity attributes, credential reference, and
 * role assignments — permissions themselves live on Role, and workspace
 * membership lives in the Workspace context.
 */
export class User extends AggregateRoot<UserId> {
  private readonly _tenantId: TenantId;
  private _email: Email;
  private _displayName: DisplayName;
  private _passwordHash?: PasswordHash;
  private _status: UserStatus;
  private readonly _roleIds: RoleId[];
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: UserSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._email = snapshot.email;
    this._displayName = snapshot.displayName;
    this._passwordHash = snapshot.passwordHash;
    this._status = snapshot.status;
    this._roleIds = [...snapshot.roleIds];
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Create a new active user and raise UserCreated. */
  static create(props: CreateUserProps, clock: Clock): User {
    const now = clock.now();
    const user = new User({
      id: props.id,
      tenantId: props.tenantId,
      email: props.email,
      displayName: props.displayName,
      passwordHash: props.passwordHash,
      status: UserStatus.active(),
      roleIds: [],
      createdAt: now,
      updatedAt: now,
    });
    user.raise({
      ...user.eventEnvelope(now),
      eventType: USER_CREATED,
      payload: {
        userId: props.id.value(),
        email: props.email.value,
        displayName: props.displayName.value,
      },
    });
    return user;
  }

  /** Rehydrate an existing user from persisted state. Raises no events. */
  static reconstitute(snapshot: UserSnapshot): User {
    return new User(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Assign a role to the user. Idempotent — assigning twice is a no-op. */
  assignRole(roleId: RoleId, clock: Clock): void {
    this.ensureMutable();
    if (this.hasRole(roleId)) return;
    const now = clock.now();
    this._roleIds.push(roleId);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ROLE_ASSIGNED,
      payload: { userId: this.id.value(), roleId: roleId.value() },
    });
  }

  /** Remove a role from the user. Idempotent. */
  revokeRole(roleId: RoleId, clock: Clock): void {
    this.ensureMutable();
    const index = this._roleIds.findIndex((existing) => existing.equals(roleId));
    if (index === -1) return;
    const now = clock.now();
    this._roleIds.splice(index, 1);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ROLE_REVOKED,
      payload: { userId: this.id.value(), roleId: roleId.value() },
    });
  }

  rename(displayName: DisplayName, clock: Clock): void {
    this.ensureMutable();
    if (this._displayName.equals(displayName)) return;
    this._displayName = displayName;
    this.touch(clock.now());
  }

  changeEmail(email: Email, clock: Clock): void {
    this.ensureMutable();
    if (this._email.equals(email)) return;
    this._email = email;
    this.touch(clock.now());
  }

  /** Rotate the local credential. Federated users may gain one this way. */
  changePasswordHash(passwordHash: PasswordHash, clock: Clock): void {
    this.ensureMutable();
    this._passwordHash = passwordHash;
    this.touch(clock.now());
  }

  suspend(reason: string, clock: Clock): void {
    const now = clock.now();
    this.transitionTo(UserStatus.suspended(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: USER_SUSPENDED,
      payload: { userId: this.id.value(), reason },
    });
  }

  reactivate(clock: Clock): void {
    const now = clock.now();
    this.transitionTo(UserStatus.active(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: USER_REACTIVATED,
      payload: { userId: this.id.value() },
    });
  }

  markDeleted(clock: Clock): void {
    if (this._status.is('deleted')) return;
    const now = clock.now();
    const previousStatus = this._status.value;
    this.transitionTo(UserStatus.deleted(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: USER_DELETED,
      payload: { userId: this.id.value(), previousStatus },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get email(): Email {
    return this._email;
  }

  get displayName(): DisplayName {
    return this._displayName;
  }

  get passwordHash(): PasswordHash | undefined {
    return this._passwordHash;
  }

  get status(): UserStatus {
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

  // ── Invariant enforcement ──────────────────────────────────────────────

  private ensureMutable(): void {
    if (!this._status.is('active')) {
      throw new InvariantViolationError(`A ${this._status.value} user cannot be modified`, {
        userId: this.id.value(),
        status: this._status.value,
      });
    }
  }

  private transitionTo(next: UserStatus, now: IsoTimestamp): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `User cannot transition from '${this._status.value}' to '${next.value}'`,
        { userId: this.id.value(), from: this._status.value, to: next.value },
      );
    }
    this._status = next;
    this.touch(now);
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyIdentityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: UserId;
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
