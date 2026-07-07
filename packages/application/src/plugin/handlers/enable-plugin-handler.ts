import { PluginId } from '@wisdum/domain';
import type { Clock, PluginRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { EnablePluginCommand } from '../commands/enable-plugin-command.js';

export class EnablePluginHandler implements CommandHandler<EnablePluginCommand> {
  constructor(
    private readonly repository: PluginRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: EnablePluginCommand): Promise<void> {
    const found = await this.repository.findById(PluginId.create(command.pluginId));
    if (!found.some) {
      throw new NotFoundError('Plugin not found', { pluginId: command.pluginId });
    }
    const plugin = found.value;
    plugin.enable(this.clock);
    await this.repository.save(plugin);
    await this.events.publishAll(plugin.pullDomainEvents());
    plugin.clearDomainEvents();
  }
}
