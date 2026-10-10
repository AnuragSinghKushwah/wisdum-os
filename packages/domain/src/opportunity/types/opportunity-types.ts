/**
 * Literal vocabularies of the opportunity bounded context. Value objects
 * wrap and validate these; the raw values appear in event payloads.
 */

/** Output kinds the Opportunity Engine can propose (Product Bible §8). */
export const OPPORTUNITY_TYPES = [
  'blog_post',
  'linkedin_post',
  'x_thread',
  'newsletter',
  'youtube_script',
  'course_module',
  'book_chapter',
  'architecture_document',
  'research_paper',
  'podcast_outline',
  'trading_report',
  'internal_documentation',
  'product_specification',
  'marketing_campaign',
  'sales_content',
] as const;
export type OpportunityTypeValue = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_STATUSES = ['proposed', 'drafted', 'published', 'dismissed'] as const;
export type OpportunityStatusValue = (typeof OPPORTUNITY_STATUSES)[number];

export const CONTENT_DRAFT_STATUSES = ['draft', 'published'] as const;
export type ContentDraftStatusValue = (typeof CONTENT_DRAFT_STATUSES)[number];
