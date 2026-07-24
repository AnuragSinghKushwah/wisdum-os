import { describe, expect, it, vi } from 'vitest';
import { DevToPublishingProvider } from './devto-publishing-provider.js';

describe('DevToPublishingProvider', () => {
  it('posts a draft to Dev.to and returns externalUrl and externalId', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: 'https://dev.to/username/my-post', id: 98765 }),
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const provider = new DevToPublishingProvider({ apiKey: 'devto-secret-token' });
    const result = await provider.publish({
      tenantId: 'tenant-1',
      publishedContentId: 'pub-1',
      slug: 'my-post',
      title: 'My Dev.to Post',
      body: '# Content here',
    });

    expect(mockFetch).toHaveBeenCalledWith('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': 'devto-secret-token',
        'Content-Type': 'application/json',
        'User-Agent': 'wisdum-platform',
      },
      body: JSON.stringify({
        article: {
          title: 'My Dev.to Post',
          published: true,
          body_markdown: '# Content here',
        },
      }),
    });

    expect(result).toEqual({
      externalUrl: 'https://dev.to/username/my-post',
      externalId: '98765',
    });

    vi.unstubAllGlobals();
  });

  it('throws on non-ok HTTP status from Dev.to API', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const provider = new DevToPublishingProvider({ apiKey: 'invalid-token' });
    await expect(
      provider.publish({
        tenantId: 'tenant-1',
        publishedContentId: 'pub-1',
        slug: 'my-post',
        title: 'Title',
        body: 'Body',
      }),
    ).rejects.toThrow(/Dev.to API error: 401/);

    vi.unstubAllGlobals();
  });

  it('exposes capability publishing.devto', () => {
    const provider = new DevToPublishingProvider({ apiKey: 'token' });
    expect(provider.capability).toBe('publishing.devto');
  });
});
