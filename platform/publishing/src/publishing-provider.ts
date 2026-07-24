/** What a draft's published snapshot looks like at the moment it's handed to a provider. */
export interface PublishTarget {
  readonly tenantId: string;
  readonly publishedContentId: string;
  readonly slug: string;
  readonly title: string;
  readonly body: string;
}

export interface PublishResult {
  readonly externalUrl: string;
  readonly externalId?: string;
}

/**
 * A destination a piece of content can be published to, behind a
 * vendor-neutral contract. Concrete providers (Wisdum's own hosted pages,
 * Dev.to, LinkedIn, ...) integrate as plugins — the core platform never
 * imports a vendor SDK directly. `capability` is the dot-namespaced string
 * (see `PluginCapability` in the domain layer) this provider implements,
 * e.g. `publishing.website`.
 */
export interface PublishingProvider {
  readonly capability: string;
  publish(target: PublishTarget): Promise<PublishResult>;
}
