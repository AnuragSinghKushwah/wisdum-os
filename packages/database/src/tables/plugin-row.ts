import type { IsoTimestamp, UUID } from '@wisdum/types';

/** A dependency entry inside `plugins.dependencies`. */
export interface PluginDependencyJson {
  readonly pluginName: string;
  readonly range: string;
}

/** Raw row shape of the `plugins` table. */
export interface PluginRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly version: string;
  readonly display_name: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly permissions: readonly string[];
  readonly dependencies: readonly PluginDependencyJson[];
  readonly status: string;
  readonly installed_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
