import type { PublishedContent } from '@wisdum/domain';

/** Wire-safe projection of a PublishedContent aggregate. */
export interface PublishedContentDto {
  readonly id: string;
  readonly opportunityId: string;
  readonly slug: string;
  readonly title: string;
  readonly body: string;
  readonly viewCount: number;
  readonly publishedAt: string;
}

export function toPublishedContentDto(published: PublishedContent): PublishedContentDto {
  return {
    id: published.getId().value(),
    opportunityId: published.opportunityId,
    slug: published.slug.value,
    title: published.title.value,
    body: published.body.value,
    viewCount: published.viewCount,
    publishedAt: published.publishedAt,
  };
}
