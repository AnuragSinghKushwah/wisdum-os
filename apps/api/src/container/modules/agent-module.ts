import {
  CreateAgentTaskHandler,
  ExecuteAgentTaskHandler,
  ListAgentTasksHandler,
} from '@wisdum/application';
import {
  InMemoryAgentTaskRepository,
  PostgresAgentTaskRepository,
  EventBusDomainEventPublisher,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { createLogger } from '@wisdum/logger';
import { executeAgentTaskCommand } from '@wisdum/application';
import {
  AGENT_HANDLERS,
  AGENT_TASK_REPOSITORY,
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  PG_POOL,
  SCHEDULER,
  OPPORTUNITY_HANDLERS,
} from '../tokens.js';

const RUNNER_INTERVAL_MS = 5000; // 5 seconds

export class AgentModule implements KernelModule {
  readonly name = 'agent';
  readonly dependsOn = ['core', 'scheduler', 'opportunity'];

  register(container: Container): void {
    // 1. Register repository
    container.register(AGENT_TASK_REPOSITORY, (c) => {
      const pool = c.resolve(PG_POOL);
      return pool !== undefined
        ? new PostgresAgentTaskRepository(pool)
        : new InMemoryAgentTaskRepository();
    });

    // 2. Register handlers
    container.register(AGENT_HANDLERS, (c) => {
      const tasks = c.resolve(AGENT_TASK_REPOSITORY);
      const ids = c.resolve(ID_GENERATOR);
      const events = new EventBusDomainEventPublisher(c.resolve(EVENT_BUS));
      const clock = c.resolve(CLOCK);

      const opportunityHandlers = c.resolve(OPPORTUNITY_HANDLERS);

      const create = new CreateAgentTaskHandler(tasks, ids, events, clock);
      const execute = new ExecuteAgentTaskHandler(
        tasks,
        opportunityHandlers.generateDraft,
        opportunityHandlers.publishDraft,
        events,
        clock,
      );
      const list = new ListAgentTasksHandler(tasks);

      return { create, execute, list };
    });

    // 3. Register background job runner on the scheduler
    const logger = createLogger('agent-task-runner');
    container.resolve(SCHEDULER).registerJob({
      name: 'agent-task-runner',
      intervalMs: RUNNER_INTERVAL_MS,
      task: async () => {
        const tasksRepo = container.resolve(AGENT_TASK_REPOSITORY);
        const agentHandlers = container.resolve(AGENT_HANDLERS);

        const pendingTasks = await tasksRepo.listPending();
        if (pendingTasks.length === 0) {
          return;
        }

        logger.info(`Found ${pendingTasks.length} pending agent tasks. Executing...`);

        for (const task of pendingTasks) {
          try {
            logger.info(`Starting execution of agent task`, {
              taskId: task.getId().value(),
              agentType: task.agentType,
            });

            await agentHandlers.execute.execute(
              executeAgentTaskCommand({
                tenantId: task.tenantId,
                taskId: task.getId().value(),
              }),
            );

            logger.info(`Agent task executed successfully`, {
              taskId: task.getId().value(),
            });
          } catch (err: any) {
            logger.error(`Failed to execute agent task`, {
              taskId: task.getId().value(),
              error: err?.message,
            });
          }
        }
      },
    });
  }
}
