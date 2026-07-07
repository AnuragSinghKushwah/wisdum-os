import type { Plugin } from '@wisdum/domain';

export interface PluginDto {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly displayName: string;
  readonly status: string;
  readonly capabilities: readonly string[];
  readonly installedAt: string;
}

export function toPluginDto(plugin: Plugin): PluginDto {
  return {
    id: plugin.getId().value(),
    name: plugin.manifest.name.value,
    version: plugin.manifest.version.toString(),
    displayName: plugin.manifest.displayName,
    status: plugin.status.value,
    capabilities: plugin.manifest.capabilities.map((capability) => capability.value),
    installedAt: plugin.installedAt,
  };
}
