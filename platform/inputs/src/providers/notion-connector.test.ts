import { describe, expect, it } from 'vitest';
import type { NotionClient, NotionPage } from './notion-client.js';
import { NotionConnector } from './notion-connector.js';

class FakeNotionClient implements NotionClient {
  constructor(private readonly pages: ReadonlyMap<string, readonly NotionPage[]>) {}
  getDatabasePages(databaseId: string): Promise<readonly NotionPage[]> {
    return Promise.resolve(this.pages.get(databaseId) || []);
  }
}

describe('NotionConnector', () => {
  it('captures pages for a configured database', async () => {
    const client = new FakeNotionClient(
      new Map([
        [
          'db-123',
          [
            {
              id: 'page-1',
              title: 'Notion Architecture Note',
              content: '# Core Design\n\nSome detail.',
              url: 'https://notion.so/page-1',
            },
          ],
        ],
      ]),
    );
    const connector = new NotionConnector(client, 'db-123');

    const items = await connector.capture();

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      title: 'Notion Architecture Note',
      body: '# Core Design\n\nSome detail.',
      mimeType: 'text/markdown',
      sourceUrl: 'https://notion.so/page-1',
    });
  });

  it('exposes its capability as input.notion', () => {
    const connector = new NotionConnector(new FakeNotionClient(new Map()), 'db-123');
    expect(connector.capability).toBe('input.notion');
  });
});
