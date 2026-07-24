import { AgentTask, AgentTaskId, type AgentTaskRepository } from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { CreateAgentTaskCommand } from '../commands/create-agent-task-command.js';

export class CreateAgentTaskHandler implements CommandHandler<
  CreateAgentTaskCommand,
  { taskId: string }
> {
  constructor(
    private readonly tasks: AgentTaskRepository,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateAgentTaskCommand): Promise<{ taskId: string }> {
    const taskId = AgentTaskId.create(this.ids.nextId());
    const task = AgentTask.create(
      {
        id: taskId,
        tenantId: command.tenantId,
        agentType: command.agentType,
        payload: command.payload,
      },
      this.clock,
    );

    await this.tasks.save(task);
    await this.events.publishAll(task.pullDomainEvents());
    task.clearDomainEvents();

    return { taskId: taskId.value() };
  }
}
