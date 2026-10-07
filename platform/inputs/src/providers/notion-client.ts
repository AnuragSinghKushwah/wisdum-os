export interface NotionPage {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly url: string;
}

/** Narrow port over the Notion REST API — retrieves database pages and their block contents. */
export interface NotionClient {
  getDatabasePages(databaseId: string): Promise<readonly NotionPage[]>;
}

const NOTION_API_BASE = 'https://api.notion.com/v1';

/** fetch-based Notion REST client, avoiding heavy external SDK dependencies. */
export class RestNotionClient implements NotionClient {
  constructor(private readonly token: string) {}

  async getDatabasePages(databaseId: string): Promise<readonly NotionPage[]> {
    const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Notion API error querying database ${databaseId}: ${response.status}`);
    }

    const body = (await response.json()) as { results?: readonly { id: string; url?: string; properties?: Record<string, { title?: { plain_text: string }[]; type?: string }>; [key: string]: unknown }[] };
    const pages: NotionPage[] = [];

    for (const result of body.results || []) {
      const pageId = result.id as string;
      const url = (result.url as string) || `https://notion.so/${pageId.replace(/-/g, '')}`;

      let title = 'Untitled Notion Page';
      if (result.properties) {
        const titleProp =
          result.properties?.title ||
          result.properties?.Name ||
          Object.values(result.properties || {}).find((p: { type?: string }) => p.type === 'title');

        if (titleProp && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
          title = titleProp.title[0]?.plain_text || title;
        }
      }

      const content = await this.getPageMarkdown(pageId);

      pages.push({
        id: pageId,
        title,
        content,
        url,
      });
    }

    return pages;
  }

  private async getPageMarkdown(pageId: string): Promise<string> {
    const response = await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children?page_size=100`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      return '';
    }

    const body = (await response.json()) as { results?: readonly { id: string; url?: string; properties?: Record<string, { title?: { plain_text: string }[]; type?: string }>; [key: string]: unknown }[] };
    const lines: string[] = [];

    for (const block of body.results || []) {
      const type = block.type;
      const blockContent = block[type as string] as { rich_text?: { plain_text?: string }[] };
      if (!blockContent || !Array.isArray(blockContent.rich_text)) continue;

      const text = blockContent.rich_text.map((t: { plain_text?: string }) => t.plain_text).join('');

      if (type === 'paragraph') {
        lines.push(text);
      } else if (type === 'heading_1') {
        lines.push(`# ${text}`);
      } else if (type === 'heading_2') {
        lines.push(`## ${text}`);
      } else if (type === 'heading_3') {
        lines.push(`### ${text}`);
      } else if (type === 'bulleted_list_item') {
        lines.push(`* ${text}`);
      } else if (type === 'numbered_list_item') {
        lines.push(`1. ${text}`);
      } else if (type === 'code') {
        lines.push(`\`\`\`\n${text}\n\`\`\``);
      }
    }

    return lines.join('\n\n');
  }
}
