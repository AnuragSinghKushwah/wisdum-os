import {
  Plugin,
  PluginCapability,
  PluginId,
  PluginManifest,
  PluginName,
  PluginPermission,
  PluginVersion,
} from '@wisdum/domain';
import type { Clock, PluginRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import { ConflictError } from '../../shared/errors.js';
import type { InstallPluginCommand } from '../commands/install-plugin-command.js';

export class InstallPluginHandler implements CommandHandler<
  InstallPluginCommand,
  { pluginId: string }
> {
  constructor(
    private readonly repository: PluginRepository,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: InstallPluginCommand): Promise<{ pluginId: string }> {
    const name = PluginName.create(command.pluginName);
    const existing = await this.repository.findByName(command.tenantId, name);
    if (existing.some) {
      throw new ConflictError('This plugin is already installed', { plugin: name.value });
    }

    const manifest = PluginManifest.create({
      name,
      version: PluginVersion.create(command.version),
      displayName: command.displayName,
      description: command.description,
      capabilities: command.capabilities.map((capability) => PluginCapability.create(capability)),
      permissions: command.permissions.map((permission) => PluginPermission.create(permission)),
      dependencies: [],
    });

    const plugin = Plugin.install(
      { id: PluginId.create(this.ids.nextId()), tenantId: command.tenantId, manifest },
      this.clock,
    );

    await this.repository.save(plugin);
    await this.events.publishAll(plugin.pullDomainEvents());
    plugin.clearDomainEvents();

    return { pluginId: plugin.getId().value() };
  }
}
