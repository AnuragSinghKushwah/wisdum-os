/**
 * Literal vocabularies of the Organization bounded context. Value objects
 * wrap and validate these; the raw values appear in event payloads.
 */

export const ORGANIZATION_STATUSES = ['active', 'suspended', 'deleted'] as const;
export type OrganizationStatusValue = (typeof ORGANIZATION_STATUSES)[number];

/**
 * State of the subscription as reported by the billing system. The
 * organization only holds a reference — billing itself lives outside
 * this context (and outside the core platform).
 */
export const SUBSCRIPTION_STATES = ['trialing', 'active', 'past-due', 'cancelled'] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

/** Policy values are JSON scalars; complex policy engines plug in via plugins. */
export type PolicyValue = string | number | boolean;
