/**
 * Literal vocabularies of the Plugin bounded context. Value objects wrap
 * and validate these; the raw values appear in event payloads.
 */

/**
 * Lifecycle of an installed plugin. Plugins install disabled — enabling is
 * an explicit, auditable act. Uninstallation is terminal for the record;
 * re-installation creates a new aggregate.
 */
export const PLUGIN_STATUSES = ['installed', 'enabled', 'disabled', 'uninstalled'] as const;
export type PluginStatusValue = (typeof PLUGIN_STATUSES)[number];
