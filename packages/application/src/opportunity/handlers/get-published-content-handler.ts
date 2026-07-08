import { PublishedContentId } from '@wisdum/domain';
import type { PublishedContentRepository } from '@wisdum/domain';
import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import { toPublishedContentDto } from '../dto/published-content-dto.js';
import type { PublishedContentDto } from '../dto/published-content-dto.js';
import type { GetPublishedContentQuery } from '../queries/get-published-content-query.js';

/**
 * The Measure step (Product Bible §11). Modeled as a query for callers,
 * but records a view as a side effect on every successful fetch — a
 * deliberate, narrow exception to "queries have no side effects", the same
 * way a page-view counter would work anywhere else.
 */
export class GetPublishedContentHandler implements QueryHandler<
  GetPublishedContentQuery,
  PublishedContentDto
> {
  constructor(private readonly published: PublishedContentRepository) {}

  async execute(query: GetPublishedContentQuery): Promise<PublishedContentDto> {
    const found = await this.published.findById(
      PublishedContentId.create(query.publishedContentId),
    );
    if (!found.some) {
      throw new NotFoundError('Published content not found', {
        publishedContentId: query.publishedContentId,
      });
    }
    found.value.recordView();
    await this.published.save(found.value);
    return toPublishedContentDto(found.value);
  }
}
