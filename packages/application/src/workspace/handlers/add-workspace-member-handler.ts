import { WorkspaceId } from '@wisdum/domain';
import type { Clock, WorkspaceRepository } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { AddWorkspaceMemberCommand } from '../commands/add-workspace-member-command.js';

export class AddWorkspaceMemberHandler implements CommandHandler<AddWorkspaceMemberCommand> {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: AddWorkspaceMemberCommand): Promise<void> {
    const found = await this.repository.findById(WorkspaceId.create(command.workspaceId));
    if (!found.some) {
      throw new NotFoundError('Workspace not found', { workspaceId: command.workspaceId });
    }
    const workspace = found.value;
    workspace.addMember(command.userId as UUID, command.role, this.clock);
    await this.repository.save(workspace);
    await this.events.publishAll(workspace.pullDomainEvents());
    workspace.clearDomainEvents();
  }
}
