import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import {
  ContentBody,
  ContentTitle,
  PublishedContent,
  PublishedContentId,
  PublishedSlug,
} from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import { toPublishedContentDto } from './published-content-dto.js';

const clock: Clock = { now: () => '2026-10-10T00:00:00.000Z' as IsoTimestamp };

describe('toPublishedContentDto', () => {
  it('exposes only measured facts, never engagement figures derived from the view count', () => {
    const published = PublishedContent.create(
      {
        id: PublishedContentId.create('00000000-0000-4000-8000-000000000001'),
        tenantId: 'tenant-a' as TenantId,
        draftId: '00000000-0000-4000-8000-000000000002' as UUID,
        opportunityId: '00000000-0000-4000-8000-000000000003' as UUID,
        slug: PublishedSlug.create('a-post'),
        title: ContentTitle.create('A post'),
        body: ContentBody.create('Body'),
        providerCapability: 'publishing.website',
        externalUrl: 'http://localhost:3000/published/x',
      },
      clock,
    );

    const dto = toPublishedContentDto(published);

    expect(Object.keys(dto).sort()).toEqual(
      [
        'body',
        'externalUrl',
        'id',
        'opportunityId',
        'providerCapability',
        'publishedAt',
        'slug',
        'title',
        'viewCount',
      ].sort(),
    );
    expect(dto.viewCount).toBe(0);
  });
});
