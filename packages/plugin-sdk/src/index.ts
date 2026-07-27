/**
 * @wisdum/plugin-sdk
 *
 * Developer SDK and manifest contracts for authoring Wisdum OS plugins.
 */

export type PluginPermission =
  | 'read_content'
  | 'publish_content'
  | 'network_access'
  | 'storage_access'
  | 'ai_inference';

export type WisdumCapability =
  | 'input_connector'
  | 'publishing_provider'
  | 'transformation_pipeline'
  | 'custom_agent';

export interface WisdumPluginManifest {
  readonly name: string;
  readonly displayName: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly homepage?: string;
  readonly capabilities: readonly WisdumCapability[];
  readonly permissions: readonly PluginPermission[];
  readonly minWisdumVersion?: string;
  readonly entrypoint?: string;
}

export interface WisdumPluginContext {
  readonly tenantId: string;
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
}

export interface WisdumPlugin<TConfig = Record<string, unknown>> {
  readonly manifest: WisdumPluginManifest;
  onInit?(context: WisdumPluginContext, config?: TConfig): Promise<void>;
  onEnable?(context: WisdumPluginContext): Promise<void>;
  onDisable?(context: WisdumPluginContext): Promise<void>;
  onUninstall?(context: WisdumPluginContext): Promise<void>;
}

/**
 * Type-safe helper for defining a Wisdum OS plugin module.
 */
export function defineWisdumPlugin<TConfig = Record<string, unknown>>(
  plugin: WisdumPlugin<TConfig>,
): WisdumPlugin<TConfig> {
  return plugin;
}
