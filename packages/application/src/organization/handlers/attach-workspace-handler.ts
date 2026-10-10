import { OrganizationId } from '@wisdum/domain';
import type { Clock, OrganizationRepository } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, TenantResourceLookup } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { AttachWorkspaceCommand } from '../commands/attach-workspace-command.js';

export class AttachWorkspaceHandler implements CommandHandler<AttachWorkspaceCommand> {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly workspaces: TenantResourceLookup,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: AttachWorkspaceCommand): Promise<void> {
    const found = await this.repository.findById(OrganizationId.create(command.organizationId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Organization not found', {
        organizationId: command.organizationId,
      });
    }
    if (!(await this.workspaces.existsInTenant(command.tenantId, command.workspaceId))) {
      throw new NotFoundError('Workspace not found', { workspaceId: command.workspaceId });
    }
    const organization = found.value;
    organization.attachWorkspace(command.workspaceId as UUID, this.clock);
    await this.repository.save(organization);
    await this.events.publishAll(organization.pullDomainEvents());
    organization.clearDomainEvents();
  }
}
