import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';

export const AGENT_TASK_CREATED = 'agent.task.created';
export const AGENT_TASK_COMPLETED = 'agent.task.completed';
export const AGENT_TASK_FAILED = 'agent.task.failed';

type AgentTaskDomainEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface AgentTaskCreatedPayload {
  readonly agentTaskId: UUID;
  readonly agentType: string;
}
export type AgentTaskCreated = AgentTaskDomainEvent<typeof AGENT_TASK_CREATED, AgentTaskCreatedPayload>;

export interface AgentTaskCompletedPayload {
  readonly agentTaskId: UUID;
}
export type AgentTaskCompleted = AgentTaskDomainEvent<typeof AGENT_TASK_COMPLETED, AgentTaskCompletedPayload>;

export interface AgentTaskFailedPayload {
  readonly agentTaskId: UUID;
  readonly error: string;
}
export type AgentTaskFailed = AgentTaskDomainEvent<typeof AGENT_TASK_FAILED, AgentTaskFailedPayload>;

export type AnyAgentTaskEvent =
  | AgentTaskCreated
  | AgentTaskCompleted
  | AgentTaskFailed;
