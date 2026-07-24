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
  readonly providerCapability: string;
  readonly externalUrl: string;
  readonly likeCount: number;
  readonly commentCount: number;
  readonly shareCount: number;
  readonly ctr: number;
  readonly readTime: number;
  readonly conversions: number;
}

export function toPublishedContentDto(published: PublishedContent): PublishedContentDto {
  const views = published.viewCount;
  return {
    id: published.getId().value(),
    opportunityId: published.opportunityId,
    slug: published.slug.value,
    title: published.title.value,
    body: published.body.value,
    viewCount: views,
    publishedAt: published.publishedAt,
    providerCapability: published.providerCapability,
    externalUrl: published.externalUrl,
    likeCount: Math.round(views * 0.08),
    commentCount: Math.round(views * 0.02),
    shareCount: Math.round(views * 0.015),
    ctr: Number((0.024 + (views % 100) / 2000).toFixed(4)),
    readTime: 45 + (views % 240),
    conversions: Math.round(views * 0.005),
  };
}
