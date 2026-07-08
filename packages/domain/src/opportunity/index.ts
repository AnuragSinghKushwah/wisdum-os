import type { DomainDescriptor } from '../shared/index.js';

/**
 * Opportunity bounded context — the Opportunity Engine (§8), Content
 * Engine (§9), and Publishing Engine + Measure (§10-11) of the Product
 * Bible, kept as one cohesive lifecycle for this POC: Insight -> proposed
 * Opportunity -> ContentDraft -> PublishedContent.
 */
export const opportunityDomain: DomainDescriptor = {
  name: 'opportunity',
  description: 'Insights, opportunities, content drafts, and published content.',
};

export * from './types/opportunity-types.js';
export * from './value-objects/opportunity-ids.js';
export * from './value-objects/insight-summary.js';
export * from './value-objects/opportunity-title.js';
export * from './value-objects/opportunity-rationale.js';
export * from './value-objects/opportunity-type.js';
export * from './value-objects/opportunity-status.js';
export * from './value-objects/content-title.js';
export * from './value-objects/content-body.js';
export * from './value-objects/content-draft-status.js';
export * from './value-objects/published-slug.js';
export * from './events/opportunity-events.js';
export * from './entities/insight.js';
export * from './entities/opportunity.js';
export * from './entities/content-draft.js';
export * from './entities/published-content.js';
export * from './repositories/opportunity-repositories.js';
