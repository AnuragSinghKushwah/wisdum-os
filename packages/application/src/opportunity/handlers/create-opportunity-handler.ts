import {
  Insight,
  InsightId,
  InsightSummary,
  Opportunity,
  OpportunityId,
  OpportunityRationale,
  OpportunityTitle,
  OpportunityType,
} from '@wisdum/domain';
import type { Clock, InsightRepository, OpportunityRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { CreateOpportunityCommand } from '../commands/create-opportunity-command.js';

export class CreateOpportunityHandler implements CommandHandler<
  CreateOpportunityCommand,
  { opportunityId: string }
> {
  constructor(
    private readonly repository: OpportunityRepository,
    private readonly insights: InsightRepository,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateOpportunityCommand): Promise<{ opportunityId: string }> {
    const insightId = this.ids.nextId();
    const insight = Insight.create(
      {
        id: InsightId.create(insightId),
        tenantId: command.tenantId,
        summary: InsightSummary.create(`Manually suggested content: ${command.title}`),
        conceptIds: [],
        sourceKnowledgeIds: [],
      },
      this.clock,
    );
    await this.insights.save(insight);

    const opportunityId = this.ids.nextId();
    const opportunity = Opportunity.create(
      {
        id: OpportunityId.create(opportunityId),
        tenantId: command.tenantId,
        insightId: insight.getId().value(),
        title: OpportunityTitle.create(command.title),
        rationale: OpportunityRationale.create(command.rationale),
        type: OpportunityType.create(command.type),
      },
      this.clock,
    );

    await this.repository.save(opportunity);
    await this.events.publishAll(opportunity.pullDomainEvents());
    opportunity.clearDomainEvents();

    return { opportunityId: opportunity.getId().value() };
  }
}
