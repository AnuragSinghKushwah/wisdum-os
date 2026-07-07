import { Organization, OrganizationId, OrganizationName, OrganizationSlug } from '@wisdum/domain';
import type { Clock, OrganizationRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator, SlugGenerator } from '../../shared/ports.js';
import { ConflictError } from '../../shared/errors.js';
import type { CreateOrganizationCommand } from '../commands/create-organization-command.js';

export class CreateOrganizationHandler implements CommandHandler<
  CreateOrganizationCommand,
  { organizationId: string }
> {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly ids: IdGenerator,
    private readonly slugs: SlugGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<{ organizationId: string }> {
    const slug = OrganizationSlug.create(this.slugs.slugify(command.name));
    const existing = await this.repository.findBySlug(slug);
    if (existing.some) {
      throw new ConflictError('An organization with this slug already exists', {
        slug: slug.value,
      });
    }

    const organization = Organization.create(
      {
        id: OrganizationId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        name: OrganizationName.create(command.name),
        slug,
      },
      this.clock,
    );

    await this.repository.save(organization);
    await this.events.publishAll(organization.pullDomainEvents());
    organization.clearDomainEvents();

    return { organizationId: organization.getId().value() };
  }
}
