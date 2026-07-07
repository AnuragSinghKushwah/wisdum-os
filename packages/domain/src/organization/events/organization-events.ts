import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type {
  OrganizationStatusValue,
  PolicyValue,
  SubscriptionState,
} from '../types/organization-types.js';

/**
 * Domain events of the Organization bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const ORGANIZATION_EVENT_SCHEMA_VERSION = 1;

export const ORGANIZATION_CREATED = 'organization.organization.created';
export const ORGANIZATION_RENAMED = 'organization.organization.renamed';
export const ORGANIZATION_SUSPENDED = 'organization.organization.suspended';
export const ORGANIZATION_REACTIVATED = 'organization.organization.reactivated';
export const ORGANIZATION_DELETED = 'organization.organization.deleted';
export const ORGANIZATION_WORKSPACE_ATTACHED = 'organization.workspace.attached';
export const ORGANIZATION_WORKSPACE_DETACHED = 'organization.workspace.detached';
export const ORGANIZATION_SUBSCRIPTION_CHANGED = 'organization.subscription.changed';
export const ORGANIZATION_BRANDING_UPDATED = 'organization.branding.updated';
export const ORGANIZATION_POLICY_CHANGED = 'organization.policy.changed';

type OrganizationEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface OrganizationCreatedPayload {
  readonly organizationId: UUID;
  readonly name: string;
  readonly slug: string;
}
export type OrganizationCreated = OrganizationEvent<
  typeof ORGANIZATION_CREATED,
  OrganizationCreatedPayload
>;

export interface OrganizationRenamedPayload {
  readonly organizationId: UUID;
  readonly from: string;
  readonly to: string;
}
export type OrganizationRenamed = OrganizationEvent<
  typeof ORGANIZATION_RENAMED,
  OrganizationRenamedPayload
>;

export interface OrganizationSuspendedPayload {
  readonly organizationId: UUID;
  readonly reason: string;
}
export type OrganizationSuspended = OrganizationEvent<
  typeof ORGANIZATION_SUSPENDED,
  OrganizationSuspendedPayload
>;

export interface OrganizationReactivatedPayload {
  readonly organizationId: UUID;
}
export type OrganizationReactivated = OrganizationEvent<
  typeof ORGANIZATION_REACTIVATED,
  OrganizationReactivatedPayload
>;

export interface OrganizationDeletedPayload {
  readonly organizationId: UUID;
  readonly previousStatus: OrganizationStatusValue;
}
export type OrganizationDeleted = OrganizationEvent<
  typeof ORGANIZATION_DELETED,
  OrganizationDeletedPayload
>;

export interface OrganizationWorkspaceAttachedPayload {
  readonly organizationId: UUID;
  readonly workspaceId: UUID;
}
export type OrganizationWorkspaceAttached = OrganizationEvent<
  typeof ORGANIZATION_WORKSPACE_ATTACHED,
  OrganizationWorkspaceAttachedPayload
>;

export interface OrganizationWorkspaceDetachedPayload {
  readonly organizationId: UUID;
  readonly workspaceId: UUID;
}
export type OrganizationWorkspaceDetached = OrganizationEvent<
  typeof ORGANIZATION_WORKSPACE_DETACHED,
  OrganizationWorkspaceDetachedPayload
>;

export interface OrganizationSubscriptionChangedPayload {
  readonly organizationId: UUID;
  readonly plan: string;
  readonly state: SubscriptionState;
}
export type OrganizationSubscriptionChanged = OrganizationEvent<
  typeof ORGANIZATION_SUBSCRIPTION_CHANGED,
  OrganizationSubscriptionChangedPayload
>;

export interface OrganizationBrandingUpdatedPayload {
  readonly organizationId: UUID;
}
export type OrganizationBrandingUpdated = OrganizationEvent<
  typeof ORGANIZATION_BRANDING_UPDATED,
  OrganizationBrandingUpdatedPayload
>;

export interface OrganizationPolicyChangedPayload {
  readonly organizationId: UUID;
  readonly key: string;
  readonly value: PolicyValue | null;
}
export type OrganizationPolicyChanged = OrganizationEvent<
  typeof ORGANIZATION_POLICY_CHANGED,
  OrganizationPolicyChangedPayload
>;

export type AnyOrganizationEvent =
  | OrganizationCreated
  | OrganizationRenamed
  | OrganizationSuspended
  | OrganizationReactivated
  | OrganizationDeleted
  | OrganizationWorkspaceAttached
  | OrganizationWorkspaceDetached
  | OrganizationSubscriptionChanged
  | OrganizationBrandingUpdated
  | OrganizationPolicyChanged;
