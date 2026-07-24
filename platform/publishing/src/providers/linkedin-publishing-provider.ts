import type { PublishingProvider, PublishResult, PublishTarget } from '../publishing-provider.js';

export interface LinkedInPublishingProviderConfig {
  readonly accessToken: string;
}

/** LinkedIn publishing provider stub. */
export class LinkedInPublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.linkedin';

  constructor(private readonly config: LinkedInPublishingProviderConfig) {}

  async publish(target: PublishTarget): Promise<PublishResult> {
    // Real implementation would post to LinkedIn Share API
    // Using mock response for UAT demonstration
    return {
      externalUrl: `https://www.linkedin.com/feed/update/urn:li:share:fake_${target.publishedContentId}`,
      externalId: `urn:li:share:fake_${target.publishedContentId}`,
    };
  }
}
