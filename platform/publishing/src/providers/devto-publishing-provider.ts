import type { PublishingProvider, PublishResult, PublishTarget } from '../publishing-provider.js';

export interface DevToPublishingProviderConfig {
  readonly apiKey: string;
}

/** Dev.to publishing provider: publishes Markdown drafts directly to Dev.to. */
export class DevToPublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.devto';

  constructor(private readonly config: DevToPublishingProviderConfig) {}

  async publish(target: PublishTarget): Promise<PublishResult> {
    const response = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'wisdum-platform',
      },
      body: JSON.stringify({
        article: {
          title: target.title,
          published: true,
          body_markdown: target.body,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Dev.to API error: ${response.status}`);
    }

    const body = (await response.json()) as { url: string; id: number };

    return {
      externalUrl: body.url,
      externalId: String(body.id),
    };
  }
}
