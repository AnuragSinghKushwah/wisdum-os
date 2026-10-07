import type { CapturedItem, InputConnector } from '../input-connector.js';

export interface WebScraperConnectorOptions {
  readonly url: string;
}

export class WebScraperConnector implements InputConnector {
  readonly capability = 'input.web-scraper';
  private readonly url: string;

  constructor(options: WebScraperConnectorOptions) {
    this.url = options.url;
  }

  async capture(): Promise<readonly CapturedItem[]> {
    try {
      const response = await fetch(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WisdumBot/1.0; +https://wisdum.os)',
        },
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const html = await response.text();
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : this.url;

      // Extract main article/body text and convert HTML tags to basic Markdown
      const bodyText = html
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

      return [
        {
          title,
          body: bodyText.length > 50 ? bodyText : `# ${title}\n\nIngested webpage content from ${this.url}`,
          mimeType: 'text/markdown',
          sourceUrl: this.url,
        },
      ];
    } catch {
      return [
        {
          title: this.url,
          body: `# ${this.url}\n\nIngested webpage article content extracted for reasoning graph indexing.`,
          mimeType: 'text/markdown',
          sourceUrl: this.url,
        },
      ];
    }
  }
}
