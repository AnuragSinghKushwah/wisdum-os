import type { PublishingProvider, PublishResult, PublishTarget } from '../publishing-provider.js';

export interface WebsitePublishingProviderConfig {
  readonly publicBaseUrl: string;
}

/**
 * First-party target: Wisdum's own hosted public page
 * (`GET /v1/published/:id`). No network I/O — deterministic URL
 * construction. Real external providers (Dev.to, phase 5) call an HTTP API
 * here instead.
 */
export class WebsitePublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.website';

  constructor(private readonly config: WebsitePublishingProviderConfig) {}

  publish(target: PublishTarget): Promise<PublishResult> {
    return Promise.resolve({
      externalUrl: `${this.config.publicBaseUrl}/v1/published/${target.publishedContentId}`,
    });
  }
}
