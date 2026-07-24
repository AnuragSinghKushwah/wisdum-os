/** One piece of content captured from an external source, ready to become a Knowledge asset. */
export interface CapturedItem {
  readonly title: string;
  readonly body: string;
  readonly mimeType: string;
  readonly sourceUrl: string;
}

/**
 * A source Capture can pull from, behind a vendor-neutral contract.
 * Concrete connectors (GitHub, Slack, Notion, ...) integrate as plugins —
 * the core platform never imports a vendor SDK directly. `capability` is
 * the dot-namespaced string (see `PluginCapability` in the domain layer)
 * this connector implements, e.g. `input.github-readme`.
 */
export interface InputConnector {
  readonly capability: string;
  capture(): Promise<readonly CapturedItem[]>;
}
