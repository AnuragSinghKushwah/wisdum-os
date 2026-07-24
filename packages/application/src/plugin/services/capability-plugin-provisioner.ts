import {
  Plugin,
  PluginCapability,
  PluginId,
  PluginManifest,
  PluginName,
  PluginVersion,
} from '@wisdum/domain';
import type { Clock, PluginRepository } from '@wisdum/domain';
import type { TenantId } from '@wisdum/types';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';

/** A first-party capability's default manifest, used to auto-provision its plugin on first use. */
export interface DefaultCapabilityManifest {
  /** `publisher/plugin` form, e.g. `wisdum/website-publishing`. */
  readonly pluginName: string;
  readonly capability: string;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
}

/**
 * Ensures a tenant has a first-party plugin providing a given capability
 * installed, auto-provisioning it pre-enabled on first use. First-party
 * capabilities ship as part of the platform rather than something a tenant
 * discovers and installs separately — but routing them through the same
 * `Plugin` aggregate as third-party plugins means enable/disable has real,
 * uniform effect everywhere, and an operator can turn one off per tenant
 * through the existing plugin routes.
 */
export class CapabilityPluginProvisioner {
  constructor(
    private readonly plugins: PluginRepository,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  /** Returns whether the capability is currently usable for this tenant. */
  async ensureEnabled(tenantId: TenantId, defaults: DefaultCapabilityManifest): Promise<boolean> {
    const capability = PluginCapability.create(defaults.capability);
    const existing = await this.plugins.findByCapability(tenantId, capability);
    if (existing.length > 0) {
      return existing.some((plugin) => plugin.isEnabled());
    }

    const manifest = PluginManifest.create({
      name: PluginName.create(defaults.pluginName),
      version: PluginVersion.create(defaults.version),
      displayName: defaults.displayName,
      description: defaults.description,
      capabilities: [capability],
      permissions: [],
      dependencies: [],
    });

    const plugin = Plugin.install(
      { id: PluginId.create(this.ids.nextId()), tenantId, manifest },
      this.clock,
    );
    plugin.enable(this.clock);

    await this.plugins.save(plugin);
    await this.events.publishAll(plugin.pullDomainEvents());
    plugin.clearDomainEvents();

    return true;
  }
}
