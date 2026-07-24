import { OpportunityId } from '@wisdum/domain';
import type { Clock, OpportunityRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { DismissOpportunityCommand } from '../commands/dismiss-opportunity-command.js';

export class DismissOpportunityHandler implements CommandHandler<DismissOpportunityCommand> {
  constructor(
    private readonly repository: OpportunityRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: DismissOpportunityCommand): Promise<void> {
    const found = await this.repository.findById(OpportunityId.create(command.opportunityId));
    if (!found.some) {
      throw new NotFoundError('Opportunity not found', { opportunityId: command.opportunityId });
    }
    const opportunity = found.value;
    opportunity.dismiss(this.clock);

    await this.repository.save(opportunity);
    await this.events.publishAll(opportunity.pullDomainEvents());
    opportunity.clearDomainEvents();
  }
}
