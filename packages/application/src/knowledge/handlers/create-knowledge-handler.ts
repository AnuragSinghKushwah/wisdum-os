import {
  KnowledgeSlug,
  KnowledgeSource,
  KnowledgeTitle,
  KnowledgeType,
  KnowledgeVisibility,
  KnowledgeDescription,
  KnowledgeLabel,
  KnowledgeId,
  Knowledge,
} from '@wisdum/domain';
import type { Clock, KnowledgeRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { IdGenerator, SlugGenerator, DomainEventPublisher } from '../../shared/ports.js';
import type { CreateKnowledgeCommand } from '../commands/create-knowledge-command.js';

/** Creates a new draft knowledge asset. Slug is derived from the title and made unique per tenant. */
export class CreateKnowledgeHandler implements CommandHandler<
  CreateKnowledgeCommand,
  { knowledgeId: string }
> {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly ids: IdGenerator,
    private readonly slugs: SlugGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateKnowledgeCommand): Promise<{ knowledgeId: string }> {
    const baseSlug = this.slugs.slugify(command.title);
    const slug = await this.uniqueSlug(command.tenantId, baseSlug);

    const knowledge = Knowledge.create(
      {
        id: KnowledgeId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        title: KnowledgeTitle.create(command.title),
        slug: KnowledgeSlug.create(slug),
        type: KnowledgeType.create(command.type),
        visibility: KnowledgeVisibility.create(command.visibility),
        source: KnowledgeSource.create({ kind: command.sourceKind, uri: command.sourceUri }),
        description:
          command.description !== undefined
            ? KnowledgeDescription.create(command.description)
            : undefined,
        labels: command.labels?.map((label) => KnowledgeLabel.create(label)),
      },
      this.clock,
    );

    await this.repository.save(knowledge);
    await this.events.publishAll(knowledge.pullDomainEvents());
    knowledge.clearDomainEvents();

    return { knowledgeId: knowledge.getId().value() };
  }

  private async uniqueSlug(
    tenantId: CreateKnowledgeCommand['tenantId'],
    baseSlug: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let attempt = 1;
    while ((await this.repository.findBySlug(tenantId, KnowledgeSlug.create(candidate))).some) {
      attempt += 1;
      candidate = `${baseSlug}-${attempt}`;
    }
    return candidate;
  }
}
