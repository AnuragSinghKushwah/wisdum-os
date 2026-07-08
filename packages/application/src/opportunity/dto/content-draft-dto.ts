import type { ContentDraft } from '@wisdum/domain';

/** Wire-safe projection of a ContentDraft aggregate. */
export interface ContentDraftDto {
  readonly id: string;
  readonly opportunityId: string;
  readonly title: string;
  readonly body: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toContentDraftDto(draft: ContentDraft): ContentDraftDto {
  return {
    id: draft.getId().value(),
    opportunityId: draft.opportunityId,
    title: draft.title.value,
    body: draft.body.value,
    status: draft.status.value,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}
