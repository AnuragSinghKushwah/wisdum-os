import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { PLUGIN_INSTALLED } from '../events/plugin-events.js';
import { PluginCapability } from '../value-objects/plugin-capability.js';
import { PluginId } from '../value-objects/plugin-id.js';
import { PluginManifest } from '../value-objects/plugin-manifest.js';
import { PluginName } from '../value-objects/plugin-name.js';
import { PluginVersion } from '../value-objects/plugin-version.js';
import { Plugin } from './plugin.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function manifest(version = '1.0.0') {
  return PluginManifest.create({
    name: PluginName.create('wisdum/test-plugin'),
    version: PluginVersion.create(version),
    displayName: 'Test Plugin',
    description: 'A plugin for tests',
    capabilities: [PluginCapability.create('storage.blob-provider')],
    permissions: [],
    dependencies: [],
  });
}

function installPlugin() {
  return Plugin.install(
    {
      id: PluginId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      manifest: manifest(),
    },
    clock,
  );
}

describe('Plugin', () => {
  it('installs in the installed state (not yet enabled) and raises PluginInstalled', () => {
    const plugin = installPlugin();
    expect(plugin.status.is('installed')).toBe(true);
    expect(plugin.isEnabled()).toBe(false);

    const events = plugin.pullDomainEvents();
    expect(events.some((event) => event.eventType === PLUGIN_INSTALLED)).toBe(true);
  });

  it('enable() then disable() round-trips the lifecycle', () => {
    const plugin = installPlugin();
    plugin.enable(clock);
    expect(plugin.isEnabled()).toBe(true);

    plugin.disable(clock);
    expect(plugin.isEnabled()).toBe(false);
    expect(plugin.status.is('disabled')).toBe(true);
  });

  it('providesCapability() reflects the manifest', () => {
    const plugin = installPlugin();
    expect(plugin.providesCapability(PluginCapability.create('storage.blob-provider'))).toBe(true);
    expect(plugin.providesCapability(PluginCapability.create('ai.llm-provider'))).toBe(false);
  });

  it('update() requires a strictly newer version of the same plugin', () => {
    const plugin = installPlugin();
    expect(() => plugin.update(manifest('1.0.0'), clock)).toThrow(/newer version/i);
    expect(() => plugin.update(manifest('0.9.0'), clock)).toThrow(/newer version/i);

    plugin.update(manifest('1.1.0'), clock);
    expect(plugin.manifest.version.toString()).toBe('1.1.0');
  });

  it('uninstall() is terminal', () => {
    const plugin = installPlugin();
    plugin.uninstall(clock);
    expect(plugin.status.is('uninstalled')).toBe(true);
    expect(() => plugin.enable(clock)).toThrow();
  });
});
