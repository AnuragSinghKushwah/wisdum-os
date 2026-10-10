import type { PublishingProvider, PublishResult, PublishTarget } from '../publishing-provider.js';

export interface WebsitePublishingProviderConfig {
  readonly publicBaseUrl: string;
}

/**
 * First-party target: Wisdum's own hosted public page, served by the web app at
 * `/published/:id` (it reads the unauthenticated `GET /v1/published/:id`). No
 * network I/O: the URL is built from the web app's public address.
 */
export class WebsitePublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.website';

  constructor(private readonly config: WebsitePublishingProviderConfig) {}

  publish(target: PublishTarget): Promise<PublishResult> {
    return Promise.resolve({
      externalUrl: `${this.config.publicBaseUrl.replace(/\/+$/, '')}/published/${target.publishedContentId}`,
    });
  }
}
