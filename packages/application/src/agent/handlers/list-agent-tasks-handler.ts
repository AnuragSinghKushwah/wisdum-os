import type { QueryHandler } from '../../shared/messages.js';
import type { AgentTaskRepository } from '@wisdum/domain';
import type { ListAgentTasksQuery } from '../queries/list-agent-tasks-query.js';

export interface AgentTaskDto {
  id: string;
  tenantId: string;
  agentType: string;
  status: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ListAgentTasksHandler implements QueryHandler<
  ListAgentTasksQuery,
  readonly AgentTaskDto[]
> {
  constructor(private readonly tasks: AgentTaskRepository) {}

  async execute(query: ListAgentTasksQuery): Promise<readonly AgentTaskDto[]> {
    const list = await this.tasks.listByTenant(query.tenantId);
    return list.map((task) => ({
      id: task.getId().value(),
      tenantId: task.tenantId,
      agentType: task.agentType,
      status: task.status,
      payload: task.payload,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }
}
