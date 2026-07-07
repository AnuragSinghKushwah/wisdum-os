import type { IsoTimestamp, UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type {
  KnowledgeSourceKind,
  KnowledgeStatusValue,
  KnowledgeTypeValue,
  KnowledgeVisibilityValue,
} from '../types/knowledge-types.js';

/**
 * Domain events of the Knowledge bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const KNOWLEDGE_EVENT_SCHEMA_VERSION = 1;

export const KNOWLEDGE_CREATED = 'knowledge.asset.created';
export const KNOWLEDGE_UPDATED = 'knowledge.asset.updated';
export const KNOWLEDGE_ARCHIVED = 'knowledge.asset.archived';
export const KNOWLEDGE_DELETED = 'knowledge.asset.deleted';
export const KNOWLEDGE_IMPORTED = 'knowledge.asset.imported';
export const KNOWLEDGE_PROCESSING_STARTED = 'knowledge.asset.processing-started';
export const KNOWLEDGE_PROCESSING_COMPLETED = 'knowledge.asset.processing-completed';
export const KNOWLEDGE_VISIBILITY_CHANGED = 'knowledge.asset.visibility-changed';

type KnowledgeEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface KnowledgeCreatedPayload {
  readonly knowledgeId: UUID;
  readonly title: string;
  readonly slug: string;
  readonly knowledgeType: KnowledgeTypeValue;
  readonly visibility: KnowledgeVisibilityValue;
  readonly sourceKind: KnowledgeSourceKind;
}
export type KnowledgeCreated = KnowledgeEvent<typeof KNOWLEDGE_CREATED, KnowledgeCreatedPayload>;

/** Granular changes (rename, description, labels, version, restore, import start). */
export interface KnowledgeUpdatedPayload {
  readonly knowledgeId: UUID;
  readonly change:
    | 'title'
    | 'description'
    | 'label-added'
    | 'label-removed'
    | 'version-incremented'
    | 'restored'
    | 'import-started';
  readonly detail: Readonly<Record<string, string>>;
}
export type KnowledgeUpdated = KnowledgeEvent<typeof KNOWLEDGE_UPDATED, KnowledgeUpdatedPayload>;

export interface KnowledgeArchivedPayload {
  readonly knowledgeId: UUID;
  readonly previousStatus: KnowledgeStatusValue;
}
export type KnowledgeArchived = KnowledgeEvent<typeof KNOWLEDGE_ARCHIVED, KnowledgeArchivedPayload>;

export interface KnowledgeDeletedPayload {
  readonly knowledgeId: UUID;
  readonly previousStatus: KnowledgeStatusValue;
}
export type KnowledgeDeleted = KnowledgeEvent<typeof KNOWLEDGE_DELETED, KnowledgeDeletedPayload>;

export interface KnowledgeImportedPayload {
  readonly knowledgeId: UUID;
  readonly sourceKind: KnowledgeSourceKind;
  readonly sourceUri: string | null;
  readonly contentReference: string;
}
export type KnowledgeImported = KnowledgeEvent<typeof KNOWLEDGE_IMPORTED, KnowledgeImportedPayload>;

export interface KnowledgeProcessingStartedPayload {
  readonly knowledgeId: UUID;
  readonly startedAt: IsoTimestamp;
}
export type KnowledgeProcessingStarted = KnowledgeEvent<
  typeof KNOWLEDGE_PROCESSING_STARTED,
  KnowledgeProcessingStartedPayload
>;

export interface KnowledgeProcessingCompletedPayload {
  readonly knowledgeId: UUID;
  readonly startedAt: IsoTimestamp | null;
  readonly completedAt: IsoTimestamp;
}
export type KnowledgeProcessingCompleted = KnowledgeEvent<
  typeof KNOWLEDGE_PROCESSING_COMPLETED,
  KnowledgeProcessingCompletedPayload
>;

export interface KnowledgeVisibilityChangedPayload {
  readonly knowledgeId: UUID;
  readonly from: KnowledgeVisibilityValue;
  readonly to: KnowledgeVisibilityValue;
}
export type KnowledgeVisibilityChanged = KnowledgeEvent<
  typeof KNOWLEDGE_VISIBILITY_CHANGED,
  KnowledgeVisibilityChangedPayload
>;

export type AnyKnowledgeEvent =
  | KnowledgeCreated
  | KnowledgeUpdated
  | KnowledgeArchived
  | KnowledgeDeleted
  | KnowledgeImported
  | KnowledgeProcessingStarted
  | KnowledgeProcessingCompleted
  | KnowledgeVisibilityChanged;
