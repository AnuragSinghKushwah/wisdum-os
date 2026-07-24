import type { PublishingProvider, PublishResult, PublishTarget } from '../publishing-provider.js';

export interface TwitterPublishingProviderConfig {
  readonly apiKey: string;
}

/** Twitter/X publishing provider stub. */
export class TwitterPublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.twitter';

  constructor(private readonly config: TwitterPublishingProviderConfig) {}

  async publish(target: PublishTarget): Promise<PublishResult> {
    // Real implementation would post to Twitter/X API v2
    // Using mock response for UAT demonstration
    return {
      externalUrl: `https://x.com/user/status/fake_${target.publishedContentId}`,
      externalId: `fake_${target.publishedContentId}`,
    };
  }
}
