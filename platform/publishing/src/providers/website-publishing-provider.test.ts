import { describe, expect, it } from 'vitest';
import { WebsitePublishingProvider } from './website-publishing-provider.js';

const target = {
  tenantId: 'tenant-a',
  publishedContentId: 'abc-123',
  slug: 'a-post',
  title: 'A post',
  body: 'Body',
} as unknown as Parameters<WebsitePublishingProvider['publish']>[0];

describe('WebsitePublishingProvider', () => {
  it('links to the shareable web page, not the API', async () => {
    const provider = new WebsitePublishingProvider({ publicBaseUrl: 'http://localhost:3000' });

    const result = await provider.publish(target);

    expect(result.externalUrl).toBe('http://localhost:3000/published/abc-123');
  });

  it('tolerates a trailing slash on the base address', async () => {
    const provider = new WebsitePublishingProvider({
      publicBaseUrl: 'https://wisdum.example.com/',
    });

    const result = await provider.publish(target);

    expect(result.externalUrl).toBe('https://wisdum.example.com/published/abc-123');
  });
});
