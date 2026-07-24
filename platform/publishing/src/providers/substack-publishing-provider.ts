import type { PublishingProvider, PublishResult, PublishTarget } from '../publishing-provider.js';

export interface SubstackPublishingProviderConfig {
  readonly webhookUrl: string;
}

/** Substack publishing provider: forwards the draft payload to a Substack integration webhook. */
export class SubstackPublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.substack';

  constructor(private readonly config: SubstackPublishingProviderConfig) {}

  async publish(target: PublishTarget): Promise<PublishResult> {
    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: target.title,
        body: target.body,
        slug: target.slug,
      }),
    });

    if (!response.ok) {
      throw new Error(`Substack webhook error: ${response.status}`);
    }

    const body = (await response.json()) as { url: string; id?: string };

    return {
      externalUrl: body.url || `https://substack.com/p/${target.slug}`,
      externalId: body.id,
    };
  }
}
