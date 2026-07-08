import { ContentDraftId } from '@wisdum/domain';
import type { ContentDraftRepository } from '@wisdum/domain';
import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import { toContentDraftDto } from '../dto/content-draft-dto.js';
import type { ContentDraftDto } from '../dto/content-draft-dto.js';
import type { GetContentDraftQuery } from '../queries/get-content-draft-query.js';

/**
 * Reads directly off `ContentDraftRepository` rather than a separate read
 * model — a plain "find by id" needs no projection beyond the aggregate
 * itself, unlike Knowledge/Opportunity which also support tenant listing.
 */
export class GetContentDraftHandler implements QueryHandler<GetContentDraftQuery, ContentDraftDto> {
  constructor(private readonly drafts: ContentDraftRepository) {}

  async execute(query: GetContentDraftQuery): Promise<ContentDraftDto> {
    const found = await this.drafts.findById(ContentDraftId.create(query.draftId));
    if (!found.some || found.value.tenantId !== query.tenantId) {
      throw new NotFoundError('Content draft not found', { draftId: query.draftId });
    }
    return toContentDraftDto(found.value);
  }
}
