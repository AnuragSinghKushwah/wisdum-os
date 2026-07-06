/** Provider categories the platform accepts as plugins (docs/architecture/overview.md). */
export type PluginCategory = 'ai' | 'auth' | 'search' | 'storage' | 'publishing' | 'analytics';

/** Static metadata every plugin declares. */
export interface PluginManifest {
  readonly name: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly description: string;
}
