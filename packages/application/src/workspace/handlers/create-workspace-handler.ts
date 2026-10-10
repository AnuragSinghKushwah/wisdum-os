import { Workspace, WorkspaceId, WorkspaceName, WorkspaceSlug } from '@wisdum/domain';
import type { Clock, WorkspaceRepository } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type {
  DomainEventPublisher,
  IdGenerator,
  SlugGenerator,
  TenantResourceLookup,
} from '../../shared/ports.js';
import type { CreateWorkspaceCommand } from '../commands/create-workspace-command.js';

export class CreateWorkspaceHandler implements CommandHandler<
  CreateWorkspaceCommand,
  { workspaceId: string }
> {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly organizations: TenantResourceLookup,
    private readonly ids: IdGenerator,
    private readonly slugs: SlugGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateWorkspaceCommand): Promise<{ workspaceId: string }> {
    if (!(await this.organizations.existsInTenant(command.tenantId, command.organizationId))) {
      throw new NotFoundError('Organization not found', { organizationId: command.organizationId });
    }

    const baseSlug = this.slugs.slugify(command.name);
    const slug = await this.uniqueSlug(command.tenantId, baseSlug);

    const workspace = Workspace.create(
      {
        id: WorkspaceId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        organizationId: command.organizationId as UUID,
        name: WorkspaceName.create(command.name),
        slug: WorkspaceSlug.create(slug),
        createdBy: command.createdBy as UUID,
      },
      this.clock,
    );

    await this.repository.save(workspace);
    await this.events.publishAll(workspace.pullDomainEvents());
    workspace.clearDomainEvents();

    return { workspaceId: workspace.getId().value() };
  }

  private async uniqueSlug(
    tenantId: CreateWorkspaceCommand['tenantId'],
    baseSlug: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let attempt = 1;
    while ((await this.repository.findBySlug(tenantId, WorkspaceSlug.create(candidate))).some) {
      attempt += 1;
      candidate = `${baseSlug}-${attempt}`;
    }
    return candidate;
  }
}
