import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { ApiKeyOwnerType, ApiKeyStatusValue } from '../types/identity-types.js';
import type { ApiKeyId } from '../value-objects/identity-ids.js';
import type { PasswordHash } from '../value-objects/password-hash.js';
import type { PermissionName } from '../value-objects/permission-name.js';
import {
  API_KEY_CREATED,
  API_KEY_REVOKED,
  IDENTITY_EVENT_SCHEMA_VERSION,
} from '../events/identity-events.js';
import type { AnyIdentityEvent } from '../events/identity-events.js';

/** What callers provide to issue a new API key. */
export interface CreateApiKeyProps {
  readonly id: ApiKeyId;
  readonly tenantId: TenantId;
  readonly ownerId: UUID;
  readonly ownerType: ApiKeyOwnerType;
  readonly label: string;
  /** Hash of the secret; the plaintext key never enters the domain. */
  readonly keyHash: PasswordHash;
  /** Permissions this key may exercise; a subset of the owner's rights. */
  readonly scopes: readonly PermissionName[];
  readonly expiresAt?: IsoTimestamp;
}

/** Full state needed to rehydrate an existing API key (no events are raised). */
export interface ApiKeySnapshot {
  readonly id: ApiKeyId;
  readonly tenantId: TenantId;
  readonly ownerId: UUID;
  readonly ownerType: ApiKeyOwnerType;
  readonly label: string;
  readonly keyHash: PasswordHash;
  readonly scopes: readonly PermissionName[];
  readonly status: ApiKeyStatusValue;
  readonly expiresAt?: IsoTimestamp;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * A long-lived credential that lets a user or service account call the
 * platform programmatically. Keys carry their own permission scopes so a
 * leaked key never grants more than it was minted for. Revocation is
 * terminal — rotation issues a new key.
 */
export class ApiKey extends AggregateRoot<ApiKeyId> {
  private readonly _tenantId: TenantId;
  private readonly _ownerId: UUID;
  private readonly _ownerType: ApiKeyOwnerType;
  private readonly _label: string;
  private readonly _keyHash: PasswordHash;
  private readonly _scopes: readonly PermissionName[];
  private _status: ApiKeyStatusValue;
  private readonly _expiresAt?: IsoTimestamp;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: ApiKeySnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._ownerId = snapshot.ownerId;
    this._ownerType = snapshot.ownerType;
    this._label = snapshot.label;
    this._keyHash = snapshot.keyHash;
    this._scopes = Object.freeze([...snapshot.scopes]);
    this._status = snapshot.status;
    this._expiresAt = snapshot.expiresAt;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Issue a new active API key and raise ApiKeyCreated. */
  static create(props: CreateApiKeyProps, clock: Clock): ApiKey {
    const now = clock.now();
    if (props.expiresAt !== undefined && props.expiresAt <= now) {
      throw new InvariantViolationError('API key expiry must be in the future', {
        apiKeyId: props.id.value(),
        expiresAt: props.expiresAt,
      });
    }
    const apiKey = new ApiKey({
      id: props.id,
      tenantId: props.tenantId,
      ownerId: props.ownerId,
      ownerType: props.ownerType,
      label: props.label,
      keyHash: props.keyHash,
      scopes: props.scopes,
      status: 'active',
      expiresAt: props.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    apiKey.raise({
      ...apiKey.eventEnvelope(now),
      eventType: API_KEY_CREATED,
      payload: {
        apiKeyId: props.id.value(),
        ownerId: props.ownerId,
        ownerType: props.ownerType,
        label: props.label,
        expiresAt: props.expiresAt ?? null,
      },
    });
    return apiKey;
  }

  /** Rehydrate an existing API key from persisted state. Raises no events. */
  static reconstitute(snapshot: ApiKeySnapshot): ApiKey {
    return new ApiKey(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Permanently revoke the key. Idempotent. */
  revoke(clock: Clock): void {
    if (this._status === 'revoked') return;
    const now = clock.now();
    this._status = 'revoked';
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: API_KEY_REVOKED,
      payload: { apiKeyId: this.id.value(), ownerId: this._ownerId },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get ownerId(): UUID {
    return this._ownerId;
  }

  get ownerType(): ApiKeyOwnerType {
    return this._ownerType;
  }

  get label(): string {
    return this._label;
  }

  get keyHash(): PasswordHash {
    return this._keyHash;
  }

  get scopes(): readonly PermissionName[] {
    return this._scopes;
  }

  get status(): ApiKeyStatusValue {
    return this._status;
  }

  get expiresAt(): IsoTimestamp | undefined {
    return this._expiresAt;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  isExpiredAt(now: IsoTimestamp): boolean {
    return this._expiresAt !== undefined && this._expiresAt <= now;
  }

  /** Whether the key can authenticate at the given moment. */
  isUsableAt(now: IsoTimestamp): boolean {
    return this._status === 'active' && !this.isExpiredAt(now);
  }

  /** Whether the key's scopes (including wildcards) cover the requested permission. */
  allows(requested: PermissionName): boolean {
    return this._scopes.some((scope) => scope.covers(requested));
  }

  private raise(event: AnyIdentityEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: ApiKeyId;
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
