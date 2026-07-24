import type { ContentDraftRepository } from '@wisdum/domain';
import type { QueryHandler } from '../../shared/messages.js';
import { toContentDraftDto } from '../dto/content-draft-dto.js';
import type { ContentDraftDto } from '../dto/content-draft-dto.js';
import type { ListContentDraftsQuery } from '../queries/list-content-drafts-query.js';

export class ListContentDraftsHandler implements QueryHandler<
  ListContentDraftsQuery,
  readonly ContentDraftDto[]
> {
  constructor(private readonly drafts: ContentDraftRepository) {}

  async execute(query: ListContentDraftsQuery): Promise<readonly ContentDraftDto[]> {
    const found = await this.drafts.listByTenant(query.tenantId);
    return found.map(toContentDraftDto);
  }
}
