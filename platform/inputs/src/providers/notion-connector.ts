import type { CapturedItem, InputConnector } from '../input-connector.js';
import type { NotionClient } from './notion-client.js';

/** Captures all pages inside a specified database from Notion. */
export class NotionConnector implements InputConnector {
  readonly capability = 'input.notion';

  constructor(
    private readonly client: NotionClient,
    private readonly databaseId: string,
  ) {}

  async capture(): Promise<readonly CapturedItem[]> {
    const pages = await this.client.getDatabasePages(this.databaseId);
    return pages.map((page) => ({
      title: page.title,
      body: page.content,
      mimeType: 'text/markdown',
      sourceUrl: page.url,
    }));
  }
}
