import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { Branding } from '../value-objects/branding.js';
import { OrganizationPolicies } from '../value-objects/organization-policies.js';
import { OrganizationStatus } from '../value-objects/organization-status.js';
import { SubscriptionReference } from '../value-objects/subscription-reference.js';
import type { PolicyValue } from '../types/organization-types.js';
import type { OrganizationId } from '../value-objects/organization-id.js';
import type { OrganizationName } from '../value-objects/organization-name.js';
import type { OrganizationSlug } from '../value-objects/organization-slug.js';
import {
  ORGANIZATION_BRANDING_UPDATED,
  ORGANIZATION_CREATED,
  ORGANIZATION_DELETED,
  ORGANIZATION_EVENT_SCHEMA_VERSION,
  ORGANIZATION_POLICY_CHANGED,
  ORGANIZATION_REACTIVATED,
  ORGANIZATION_RENAMED,
  ORGANIZATION_SUBSCRIPTION_CHANGED,
  ORGANIZATION_SUSPENDED,
  ORGANIZATION_WORKSPACE_ATTACHED,
  ORGANIZATION_WORKSPACE_DETACHED,
} from '../events/organization-events.js';
import type { AnyOrganizationEvent } from '../events/organization-events.js';

/** What callers provide to create a new organization. */
export interface CreateOrganizationProps {
  readonly id: OrganizationId;
  readonly tenantId: TenantId;
  readonly name: OrganizationName;
  readonly slug: OrganizationSlug;
  readonly subscription?: SubscriptionReference;
}

/** Full state needed to rehydrate an existing organization (no events are raised). */
export interface OrganizationSnapshot {
  readonly id: OrganizationId;
  readonly tenantId: TenantId;
  readonly name: OrganizationName;
  readonly slug: OrganizationSlug;
  readonly status: OrganizationStatus;
  readonly workspaceIds: readonly UUID[];
  readonly subscription: SubscriptionReference;
  readonly branding: Branding;
  readonly policies: OrganizationPolicies;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Aggregate root of the Organization bounded context: the tenant-level
 * umbrella over workspaces. An organization owns its workspace membership
 * list, subscription reference, branding, and policies. Authentication
 * belongs to the Identity context and must never leak in here; billing
 * details stay behind the subscription reference.
 */
export class Organization extends AggregateRoot<OrganizationId> {
  private readonly _tenantId: TenantId;
  private _name: OrganizationName;
  private readonly _slug: OrganizationSlug;
  private _status: OrganizationStatus;
  private readonly _workspaceIds: UUID[];
  private _subscription: SubscriptionReference;
  private _branding: Branding;
  private _policies: OrganizationPolicies;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: OrganizationSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._name = snapshot.name;
    this._slug = snapshot.slug;
    this._status = snapshot.status;
    this._workspaceIds = [...snapshot.workspaceIds];
    this._subscription = snapshot.subscription;
    this._branding = snapshot.branding;
    this._policies = snapshot.policies;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Create a new active organization and raise OrganizationCreated. */
  static create(props: CreateOrganizationProps, clock: Clock): Organization {
    const now = clock.now();
    const organization = new Organization({
      id: props.id,
      tenantId: props.tenantId,
      name: props.name,
      slug: props.slug,
      status: OrganizationStatus.active(),
      workspaceIds: [],
      subscription: props.subscription ?? SubscriptionReference.freeTier(),
      branding: Branding.none(),
      policies: OrganizationPolicies.empty(),
      createdAt: now,
      updatedAt: now,
    });
    organization.raise({
      ...organization.eventEnvelope(now),
      eventType: ORGANIZATION_CREATED,
      payload: {
        organizationId: props.id.value(),
        name: props.name.value,
        slug: props.slug.value,
      },
    });
    return organization;
  }

  /** Rehydrate an existing organization from persisted state. Raises no events. */
  static reconstitute(snapshot: OrganizationSnapshot): Organization {
    return new Organization(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  rename(name: OrganizationName, clock: Clock): void {
    this.ensureMutable();
    if (this._name.equals(name)) return;
    const now = clock.now();
    const from = this._name;
    this._name = name;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_RENAMED,
      payload: { organizationId: this.id.value(), from: from.value, to: name.value },
    });
  }

  /** Record that a workspace belongs to this organization. Idempotent. */
  attachWorkspace(workspaceId: UUID, clock: Clock): void {
    this.ensureMutable();
    if (this.hasWorkspace(workspaceId)) return;
    const now = clock.now();
    this._workspaceIds.push(workspaceId);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_WORKSPACE_ATTACHED,
      payload: { organizationId: this.id.value(), workspaceId },
    });
  }

  /** Record that a workspace no longer belongs to this organization. Idempotent. */
  detachWorkspace(workspaceId: UUID, clock: Clock): void {
    this.ensureMutable();
    const index = this._workspaceIds.indexOf(workspaceId);
    if (index === -1) return;
    const now = clock.now();
    this._workspaceIds.splice(index, 1);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_WORKSPACE_DETACHED,
      payload: { organizationId: this.id.value(), workspaceId },
    });
  }

  /** Reflect a subscription change reported by the billing system. */
  changeSubscription(subscription: SubscriptionReference, clock: Clock): void {
    if (this._status.is('deleted')) {
      throw new InvariantViolationError('A deleted organization cannot change subscription', {
        organizationId: this.id.value(),
      });
    }
    if (this._subscription.equals(subscription)) return;
    const now = clock.now();
    this._subscription = subscription;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_SUBSCRIPTION_CHANGED,
      payload: {
        organizationId: this.id.value(),
        plan: subscription.plan,
        state: subscription.state,
      },
    });
  }

  updateBranding(branding: Branding, clock: Clock): void {
    this.ensureMutable();
    if (this._branding.equals(branding)) return;
    const now = clock.now();
    this._branding = branding;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_BRANDING_UPDATED,
      payload: { organizationId: this.id.value() },
    });
  }

  setPolicy(key: string, value: PolicyValue, clock: Clock): void {
    this.ensureMutable();
    if (this._policies.get(key) === value) return;
    const now = clock.now();
    this._policies = this._policies.with(key, value);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_POLICY_CHANGED,
      payload: { organizationId: this.id.value(), key, value },
    });
  }

  removePolicy(key: string, clock: Clock): void {
    this.ensureMutable();
    if (!this._policies.has(key)) return;
    const now = clock.now();
    this._policies = this._policies.without(key);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_POLICY_CHANGED,
      payload: { organizationId: this.id.value(), key, value: null },
    });
  }

  suspend(reason: string, clock: Clock): void {
    const now = clock.now();
    this.transitionTo(OrganizationStatus.suspended(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_SUSPENDED,
      payload: { organizationId: this.id.value(), reason },
    });
  }

  reactivate(clock: Clock): void {
    const now = clock.now();
    this.transitionTo(OrganizationStatus.active(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_REACTIVATED,
      payload: { organizationId: this.id.value() },
    });
  }

  /** Deletion requires all workspaces to be detached first. */
  markDeleted(clock: Clock): void {
    if (this._status.is('deleted')) return;
    if (this._workspaceIds.length > 0) {
      throw new InvariantViolationError(
        'An organization with attached workspaces cannot be deleted',
        { organizationId: this.id.value(), workspaceCount: this._workspaceIds.length },
      );
    }
    const now = clock.now();
    const previousStatus = this._status.value;
    this.transitionTo(OrganizationStatus.deleted(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: ORGANIZATION_DELETED,
      payload: { organizationId: this.id.value(), previousStatus },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): OrganizationName {
    return this._name;
  }

  get slug(): OrganizationSlug {
    return this._slug;
  }

  get status(): OrganizationStatus {
    return this._status;
  }

  get workspaceIds(): readonly UUID[] {
    return Object.freeze([...this._workspaceIds]);
  }

  get subscription(): SubscriptionReference {
    return this._subscription;
  }

  get branding(): Branding {
    return this._branding;
  }

  get policies(): OrganizationPolicies {
    return this._policies;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  hasWorkspace(workspaceId: UUID): boolean {
    return this._workspaceIds.includes(workspaceId);
  }

  workspaceCount(): number {
    return this._workspaceIds.length;
  }

  // ── Invariant enforcement ──────────────────────────────────────────────

  private ensureMutable(): void {
    if (!this._status.is('active')) {
      throw new InvariantViolationError(`A ${this._status.value} organization cannot be modified`, {
        organizationId: this.id.value(),
        status: this._status.value,
      });
    }
  }

  private transitionTo(next: OrganizationStatus, now: IsoTimestamp): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Organization cannot transition from '${this._status.value}' to '${next.value}'`,
        { organizationId: this.id.value(), from: this._status.value, to: next.value },
      );
    }
    this._status = next;
    this.touch(now);
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyOrganizationEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: OrganizationId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: ORGANIZATION_EVENT_SCHEMA_VERSION,
    };
  }
}
