import type { CapturedItem, InputConnector } from '../input-connector.js';

export interface WebScraperConnectorOptions {
  readonly url: string;
  /** Injected in tests; defaults to the global `fetch`. */
  readonly fetch?: typeof fetch;
}

/**
 * Captures one web page as Markdown. When the page cannot be read it fails
 * with the reason; it never substitutes placeholder text, because whatever is
 * captured becomes source material that drafts are written from.
 */
export class WebScraperConnector implements InputConnector {
  readonly capability = 'input.web-scraper';
  private readonly url: string;
  private readonly fetchPage: typeof fetch;

  constructor(options: WebScraperConnectorOptions) {
    this.url = options.url;
    this.fetchPage = options.fetch ?? fetch;
  }

  async capture(): Promise<readonly CapturedItem[]> {
    let response: Response;
    try {
      response = await this.fetchPage(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WisdumBot/1.0; +https://wisdum.os)',
        },
      });
    } catch (error) {
      throw new Error(
        `Could not read ${this.url}: ${error instanceof Error ? error.message : 'the request failed'}`,
      );
    }
    if (!response.ok) {
      throw new Error(`Could not read ${this.url}: the server answered ${response.status}`);
    }

    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : this.url;

    // Extract main article/body text and convert HTML tags to basic Markdown
    const bodyText = html
      .replace(/<title\b[\s\S]*?<\/title>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (bodyText.length === 0) return [];
    return [{ title, body: bodyText, mimeType: 'text/markdown', sourceUrl: this.url }];
  }
}
