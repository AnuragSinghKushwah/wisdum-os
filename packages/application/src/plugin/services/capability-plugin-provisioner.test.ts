import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { PluginCapability } from '@wisdum/domain';
import type { Clock, PluginId, PluginRepository, Plugin } from '@wisdum/domain';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import { CapabilityPluginProvisioner } from './capability-plugin-provisioner.js';
import type { DefaultCapabilityManifest } from './capability-plugin-provisioner.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

let idCounter = 0;
const ids: IdGenerator = {
  nextId: () => {
    idCounter += 1;
    return `00000000-0000-0000-0000-${idCounter.toString().padStart(12, '0')}` as UUID;
  },
};

const events: DomainEventPublisher = { publishAll: () => Promise.resolve() };

class FakePluginRepository implements PluginRepository {
  private readonly byId = new Map<string, Plugin>();
  findById(id: PluginId): Promise<Option<Plugin>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findByName(): Promise<Option<Plugin>> {
    throw new Error('not used in this test');
  }
  findByCapability(tenantId: TenantId, capability: PluginCapability): Promise<readonly Plugin[]> {
    return Promise.resolve(
      [...this.byId.values()].filter(
        (plugin) => plugin.tenantId === tenantId && plugin.providesCapability(capability),
      ),
    );
  }
  findAll(tenantId: TenantId): Promise<readonly Plugin[]> {
    return Promise.resolve([...this.byId.values()].filter((p) => p.tenantId === tenantId));
  }
  save(plugin: Plugin): Promise<void> {
    this.byId.set(plugin.getId().value(), plugin);
    return Promise.resolve();
  }
  delete(plugin: Plugin): Promise<void> {
    this.byId.delete(plugin.getId().value());
    return Promise.resolve();
  }
}

const WEBSITE_PUBLISHING: DefaultCapabilityManifest = {
  pluginName: 'wisdum/website-publishing',
  capability: 'publishing.website',
  displayName: 'Website Publishing',
  description: 'Publishes content to Wisdum-hosted public pages.',
  version: '1.0.0',
};

describe('CapabilityPluginProvisioner', () => {
  it('auto-installs and enables a first-party plugin on first use', async () => {
    const plugins = new FakePluginRepository();
    const provisioner = new CapabilityPluginProvisioner(plugins, ids, events, clock);

    const enabled = await provisioner.ensureEnabled(TENANT_ID, WEBSITE_PUBLISHING);

    expect(enabled).toBe(true);
    const found = await plugins.findByCapability(
      TENANT_ID,
      PluginCapability.create(WEBSITE_PUBLISHING.capability),
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.isEnabled()).toBe(true);
  });

  it('does not re-install once a plugin exists, and reports disabled honestly', async () => {
    const plugins = new FakePluginRepository();
    const provisioner = new CapabilityPluginProvisioner(plugins, ids, events, clock);

    await provisioner.ensureEnabled(TENANT_ID, WEBSITE_PUBLISHING);
    const [installed] = await plugins.findByCapability(
      TENANT_ID,
      PluginCapability.create(WEBSITE_PUBLISHING.capability),
    );
    installed?.disable(clock);
    await plugins.save(installed as Plugin);

    const enabled = await provisioner.ensureEnabled(TENANT_ID, WEBSITE_PUBLISHING);

    expect(enabled).toBe(false);
    const found = await plugins.findByCapability(
      TENANT_ID,
      PluginCapability.create(WEBSITE_PUBLISHING.capability),
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.status.value).toBe('disabled');
  });
});
