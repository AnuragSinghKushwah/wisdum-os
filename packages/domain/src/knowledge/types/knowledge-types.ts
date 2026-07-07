/**
 * Literal vocabularies of the Knowledge bounded context. Value objects wrap
 * and validate these; the raw values appear in event payloads.
 */

export const KNOWLEDGE_TYPES = [
  'note',
  'document',
  'webpage',
  'repository',
  'pdf',
  'markdown',
  'image',
  'video',
  'audio',
  'dataset',
  'conversation',
] as const;
export type KnowledgeTypeValue = (typeof KNOWLEDGE_TYPES)[number];

export const KNOWLEDGE_STATUSES = [
  'draft',
  'importing',
  'processing',
  'active',
  'archived',
  'deleted',
] as const;
export type KnowledgeStatusValue = (typeof KNOWLEDGE_STATUSES)[number];

export const KNOWLEDGE_VISIBILITIES = ['private', 'workspace', 'public'] as const;
export type KnowledgeVisibilityValue = (typeof KNOWLEDGE_VISIBILITIES)[number];

export const KNOWLEDGE_SOURCE_KINDS = ['manual', 'upload', 'url', 'integration'] as const;
export type KnowledgeSourceKind = (typeof KNOWLEDGE_SOURCE_KINDS)[number];

/** Free-form, string-valued domain properties attached to a knowledge asset. */
export type KnowledgeProperties = Readonly<Record<string, string>>;
