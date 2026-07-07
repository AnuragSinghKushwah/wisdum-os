import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { FeatureFlags } from '../value-objects/feature-flags.js';
import { WorkspaceLimits } from '../value-objects/workspace-limits.js';
import { WorkspaceMember } from '../value-objects/workspace-member.js';
import { WorkspaceSettings } from '../value-objects/workspace-settings.js';
import { WorkspaceStatus } from '../value-objects/workspace-status.js';
import type { WorkspaceMemberRole, WorkspaceSettingValue } from '../types/workspace-types.js';
import type { WorkspaceId } from '../value-objects/workspace-id.js';
import type { WorkspaceName } from '../value-objects/workspace-name.js';
import type { WorkspaceSlug } from '../value-objects/workspace-slug.js';
import {
  WORKSPACE_ARCHIVED,
  WORKSPACE_CREATED,
  WORKSPACE_DELETED,
  WORKSPACE_EVENT_SCHEMA_VERSION,
  WORKSPACE_FEATURE_FLAG_TOGGLED,
  WORKSPACE_LIMITS_CHANGED,
  WORKSPACE_MEMBER_ADDED,
  WORKSPACE_MEMBER_REMOVED,
  WORKSPACE_MEMBER_ROLE_CHANGED,
  WORKSPACE_RENAMED,
  WORKSPACE_RESTORED,
  WORKSPACE_SETTING_CHANGED,
} from '../events/workspace-events.js';
import type { AnyWorkspaceEvent } from '../events/workspace-events.js';

/** What callers provide to create a new workspace. */
export interface CreateWorkspaceProps {
  readonly id: WorkspaceId;
  readonly tenantId: TenantId;
  /** The owning organization; the Organization aggregate tracks the inverse side. */
  readonly organizationId: UUID;
  readonly name: WorkspaceName;
  readonly slug: WorkspaceSlug;
  /** The creating user becomes the first owner — a workspace is never ownerless. */
  readonly createdBy: UUID;
  readonly limits?: WorkspaceLimits;
}

/** Full state needed to rehydrate an existing workspace (no events are raised). */
export interface WorkspaceSnapshot {
  readonly id: WorkspaceId;
  readonly tenantId: TenantId;
  readonly organizationId: UUID;
  readonly name: WorkspaceName;
  readonly slug: WorkspaceSlug;
  readonly status: WorkspaceStatus;
  readonly members: readonly WorkspaceMember[];
  readonly settings: WorkspaceSettings;
  readonly limits: WorkspaceLimits;
  readonly featureFlags: FeatureFlags;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Aggregate root of the Workspace bounded context: the collaboration
 * container where knowledge work happens. A workspace owns its members,
 * settings, limits, and feature flags. Billing belongs to the Organization
 * context and must never leak in here.
 *
 * Invariants: at least one owner at all times; membership never exceeds
 * the member limit; only active workspaces accept changes.
 */
export class Workspace extends AggregateRoot<WorkspaceId> {
  private readonly _tenantId: TenantId;
  private readonly _organizationId: UUID;
  private _name: WorkspaceName;
  private readonly _slug: WorkspaceSlug;
  private _status: WorkspaceStatus;
  private _members: WorkspaceMember[];
  private _settings: WorkspaceSettings;
  private _limits: WorkspaceLimits;
  private _featureFlags: FeatureFlags;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: WorkspaceSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._organizationId = snapshot.organizationId;
    this._name = snapshot.name;
    this._slug = snapshot.slug;
    this._status = snapshot.status;
    this._members = [...snapshot.members];
    this._settings = snapshot.settings;
    this._limits = snapshot.limits;
    this._featureFlags = snapshot.featureFlags;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Create a new active workspace with its first owner and raise WorkspaceCreated. */
  static create(props: CreateWorkspaceProps, clock: Clock): Workspace {
    const now = clock.now();
    const workspace = new Workspace({
      id: props.id,
      tenantId: props.tenantId,
      organizationId: props.organizationId,
      name: props.name,
      slug: props.slug,
      status: WorkspaceStatus.active(),
      members: [WorkspaceMember.create({ userId: props.createdBy, role: 'owner', joinedAt: now })],
      settings: WorkspaceSettings.empty(),
      limits: props.limits ?? WorkspaceLimits.unlimited(),
      featureFlags: FeatureFlags.empty(),
      createdAt: now,
      updatedAt: now,
    });
    workspace.raise({
      ...workspace.eventEnvelope(now),
      eventType: WORKSPACE_CREATED,
      payload: {
        workspaceId: props.id.value(),
        organizationId: props.organizationId,
        name: props.name.value,
        slug: props.slug.value,
      },
    });
    workspace.raise({
      ...workspace.eventEnvelope(now),
      eventType: WORKSPACE_MEMBER_ADDED,
      payload: { workspaceId: props.id.value(), userId: props.createdBy, role: 'owner' },
    });
    return workspace;
  }

  /** Rehydrate an existing workspace from persisted state. Raises no events. */
  static reconstitute(snapshot: WorkspaceSnapshot): Workspace {
    if (!snapshot.members.some((member) => member.isOwner())) {
      throw new InvariantViolationError('A workspace must have at least one owner', {
        workspaceId: snapshot.id.value(),
      });
    }
    return new Workspace(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  rename(name: WorkspaceName, clock: Clock): void {
    this.ensureMutable();
    if (this._name.equals(name)) return;
    const now = clock.now();
    const from = this._name;
    this._name = name;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_RENAMED,
      payload: { workspaceId: this.id.value(), from: from.value, to: name.value },
    });
  }

  /** Add a member. Idempotent for the same user regardless of role. */
  addMember(userId: UUID, role: WorkspaceMemberRole, clock: Clock): void {
    this.ensureMutable();
    if (this.isMember(userId)) return;
    if (!this._limits.allowsMemberCount(this._members.length + 1)) {
      throw new InvariantViolationError('Workspace member limit reached', {
        workspaceId: this.id.value(),
        limit: this._limits.maxMembers,
      });
    }
    const now = clock.now();
    this._members.push(WorkspaceMember.create({ userId, role, joinedAt: now }));
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_MEMBER_ADDED,
      payload: { workspaceId: this.id.value(), userId, role },
    });
  }

  /** Remove a member. The last owner can never be removed. */
  removeMember(userId: UUID, clock: Clock): void {
    this.ensureMutable();
    const member = this.findMember(userId);
    if (member === undefined) return;
    this.ensureNotLastOwner(member);
    const now = clock.now();
    this._members = this._members.filter((existing) => existing.userId !== userId);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_MEMBER_REMOVED,
      payload: { workspaceId: this.id.value(), userId },
    });
  }

  /** Change a member's role. The last owner cannot be demoted. */
  changeMemberRole(userId: UUID, role: WorkspaceMemberRole, clock: Clock): void {
    this.ensureMutable();
    const member = this.findMember(userId);
    if (member === undefined) {
      throw new InvariantViolationError('Cannot change role of a non-member', {
        workspaceId: this.id.value(),
        userId,
      });
    }
    if (member.role === role) return;
    if (role !== 'owner') this.ensureNotLastOwner(member);
    const now = clock.now();
    this._members = this._members.map((existing) =>
      existing.userId === userId ? existing.withRole(role) : existing,
    );
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_MEMBER_ROLE_CHANGED,
      payload: { workspaceId: this.id.value(), userId, from: member.role, to: role },
    });
  }

  setSetting(key: string, value: WorkspaceSettingValue, clock: Clock): void {
    this.ensureMutable();
    if (this._settings.get(key) === value) return;
    const now = clock.now();
    this._settings = this._settings.with(key, value);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_SETTING_CHANGED,
      payload: { workspaceId: this.id.value(), key, value },
    });
  }

  removeSetting(key: string, clock: Clock): void {
    this.ensureMutable();
    if (!this._settings.has(key)) return;
    const now = clock.now();
    this._settings = this._settings.without(key);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_SETTING_CHANGED,
      payload: { workspaceId: this.id.value(), key, value: null },
    });
  }

  /** Apply new limits (handed down from the organization's plan). */
  applyLimits(limits: WorkspaceLimits, clock: Clock): void {
    this.ensureMutable();
    if (this._limits.equals(limits)) return;
    const now = clock.now();
    this._limits = limits;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_LIMITS_CHANGED,
      payload: {
        workspaceId: this.id.value(),
        maxMembers: limits.maxMembers ?? null,
        maxKnowledgeAssets: limits.maxKnowledgeAssets ?? null,
        maxStorageBytes: limits.maxStorageBytes ?? null,
      },
    });
  }

  toggleFeatureFlag(flag: string, enabled: boolean, clock: Clock): void {
    this.ensureMutable();
    if (this._featureFlags.isEnabled(flag) === enabled) return;
    const now = clock.now();
    this._featureFlags = this._featureFlags.with(flag, enabled);
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_FEATURE_FLAG_TOGGLED,
      payload: { workspaceId: this.id.value(), flag, enabled },
    });
  }

  archive(clock: Clock): void {
    const now = clock.now();
    this.transitionTo(WorkspaceStatus.archived(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_ARCHIVED,
      payload: { workspaceId: this.id.value() },
    });
  }

  restore(clock: Clock): void {
    const now = clock.now();
    this.transitionTo(WorkspaceStatus.active(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_RESTORED,
      payload: { workspaceId: this.id.value() },
    });
  }

  markDeleted(clock: Clock): void {
    if (this._status.is('deleted')) return;
    const now = clock.now();
    const previousStatus = this._status.value;
    this.transitionTo(WorkspaceStatus.deleted(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: WORKSPACE_DELETED,
      payload: { workspaceId: this.id.value(), previousStatus },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get organizationId(): UUID {
    return this._organizationId;
  }

  get name(): WorkspaceName {
    return this._name;
  }

  get slug(): WorkspaceSlug {
    return this._slug;
  }

  get status(): WorkspaceStatus {
    return this._status;
  }

  get members(): readonly WorkspaceMember[] {
    return Object.freeze([...this._members]);
  }

  get settings(): WorkspaceSettings {
    return this._settings;
  }

  get limits(): WorkspaceLimits {
    return this._limits;
  }

  get featureFlags(): FeatureFlags {
    return this._featureFlags;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  isMember(userId: UUID): boolean {
    return this.findMember(userId) !== undefined;
  }

  memberCount(): number {
    return this._members.length;
  }

  private findMember(userId: UUID): WorkspaceMember | undefined {
    return this._members.find((member) => member.userId === userId);
  }

  // ── Invariant enforcement ──────────────────────────────────────────────

  private ensureMutable(): void {
    if (!this._status.is('active')) {
      throw new InvariantViolationError(`A ${this._status.value} workspace cannot be modified`, {
        workspaceId: this.id.value(),
        status: this._status.value,
      });
    }
  }

  private ensureNotLastOwner(member: WorkspaceMember): void {
    const ownerCount = this._members.filter((existing) => existing.isOwner()).length;
    if (member.isOwner() && ownerCount === 1) {
      throw new InvariantViolationError('A workspace must retain at least one owner', {
        workspaceId: this.id.value(),
        userId: member.userId,
      });
    }
  }

  private transitionTo(next: WorkspaceStatus, now: IsoTimestamp): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Workspace cannot transition from '${this._status.value}' to '${next.value}'`,
        { workspaceId: this.id.value(), from: this._status.value, to: next.value },
      );
    }
    this._status = next;
    this.touch(now);
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyWorkspaceEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: WorkspaceId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: WORKSPACE_EVENT_SCHEMA_VERSION,
    };
  }
}
