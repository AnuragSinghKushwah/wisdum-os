import { WorkspaceId } from '@wisdum/domain';
import type { Clock, WorkspaceRepository, WorkspaceSettingValue } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { UpdateWorkspaceSettingsCommand } from '../commands/update-workspace-settings-command.js';

export class UpdateWorkspaceSettingsHandler implements CommandHandler<UpdateWorkspaceSettingsCommand> {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateWorkspaceSettingsCommand): Promise<void> {
    const found = await this.repository.findById(WorkspaceId.create(command.workspaceId));
    if (!found.some) {
      throw new NotFoundError('Workspace not found', { workspaceId: command.workspaceId });
    }
    const workspace = found.value;
    workspace.setSetting(command.key, command.value as unknown as WorkspaceSettingValue, this.clock);
    await this.repository.save(workspace);
    await this.events.publishAll(workspace.pullDomainEvents());
    workspace.clearDomainEvents();
  }
}
