import {
  AgentTask,
  AgentTaskId,
  type AgentTaskRepository,
} from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import type { ExecuteAgentTaskCommand } from '../commands/execute-agent-task-command.js';
import { GenerateContentDraftHandler } from '../../opportunity/handlers/generate-content-draft-handler.js';
import { PublishContentDraftHandler } from '../../opportunity/handlers/publish-content-draft-handler.js';
import { generateContentDraftCommand } from '../../opportunity/commands/generate-content-draft-command.js';
import { publishContentDraftCommand } from '../../opportunity/commands/publish-content-draft-command.js';

export class ExecuteAgentTaskHandler implements CommandHandler<
  ExecuteAgentTaskCommand,
  void
> {
  constructor(
    private readonly tasks: AgentTaskRepository,
    private readonly generateDraft: GenerateContentDraftHandler,
    private readonly publishDraft: PublishContentDraftHandler,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: ExecuteAgentTaskCommand): Promise<void> {
    const found = await this.tasks.findById(AgentTaskId.create(command.taskId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Agent task not found', { taskId: command.taskId });
    }
    const task = found.value;

    try {
      task.startExecution(this.clock);
      await this.tasks.save(task);

      let resultPayload: Record<string, any> = {};

      if (task.agentType === 'writing') {
        const opportunityId = task.payload.opportunityId;
        if (!opportunityId) {
          throw new Error('Missing opportunityId in writing agent task payload');
        }
        // Execute writing draft generation
        const { draftId } = await this.generateDraft.execute(
          generateContentDraftCommand({
            tenantId: task.tenantId,
            opportunityId,
          }),
        );
        resultPayload = { draftId };
      } else if (task.agentType === 'publishing') {
        const draftId = task.payload.draftId;
        if (!draftId) {
          throw new Error('Missing draftId in publishing agent task payload');
        }
        // Execute publishing draft content
        const { publishedId, externalUrl } = await this.publishDraft.execute(
          publishContentDraftCommand({
            tenantId: task.tenantId,
            draftId,
          }),
        );
        resultPayload = { publishedContentId: publishedId, externalUrl };
      } else {
        throw new Error(`Unsupported agentType: ${task.agentType}`);
      }

      task.complete(resultPayload, this.clock);
      await this.tasks.save(task);
      await this.events.publishAll(task.pullDomainEvents());
      task.clearDomainEvents();

    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error occurred during execution';
      task.fail(errorMessage, this.clock);
      await this.tasks.save(task);
      await this.events.publishAll(task.pullDomainEvents());
      task.clearDomainEvents();
      throw err;
    }
  }
}
