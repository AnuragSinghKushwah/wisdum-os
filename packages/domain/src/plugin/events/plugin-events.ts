import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';

/**
 * Domain events of the Plugin bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const PLUGIN_EVENT_SCHEMA_VERSION = 1;

export const PLUGIN_INSTALLED = 'plugin.plugin.installed';
export const PLUGIN_UPDATED = 'plugin.plugin.updated';
export const PLUGIN_ENABLED = 'plugin.plugin.enabled';
export const PLUGIN_DISABLED = 'plugin.plugin.disabled';
export const PLUGIN_UNINSTALLED = 'plugin.plugin.uninstalled';

type PluginEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface PluginInstalledPayload {
  readonly pluginId: UUID;
  readonly name: string;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly permissions: readonly string[];
}
export type PluginInstalled = PluginEvent<typeof PLUGIN_INSTALLED, PluginInstalledPayload>;

export interface PluginUpdatedPayload {
  readonly pluginId: UUID;
  readonly name: string;
  readonly fromVersion: string;
  readonly toVersion: string;
}
export type PluginUpdated = PluginEvent<typeof PLUGIN_UPDATED, PluginUpdatedPayload>;

export interface PluginEnabledPayload {
  readonly pluginId: UUID;
  readonly name: string;
}
export type PluginEnabled = PluginEvent<typeof PLUGIN_ENABLED, PluginEnabledPayload>;

export interface PluginDisabledPayload {
  readonly pluginId: UUID;
  readonly name: string;
}
export type PluginDisabled = PluginEvent<typeof PLUGIN_DISABLED, PluginDisabledPayload>;

export interface PluginUninstalledPayload {
  readonly pluginId: UUID;
  readonly name: string;
}
export type PluginUninstalled = PluginEvent<typeof PLUGIN_UNINSTALLED, PluginUninstalledPayload>;

export type AnyPluginEvent =
  PluginInstalled | PluginUpdated | PluginEnabled | PluginDisabled | PluginUninstalled;
