import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { AgentTask } from '../entities/agent-task.js';
import type { AgentTaskId } from '../value-objects/agent-task-ids.js';

export interface AgentTaskRepository extends Repository<AgentTask> {
  findById(id: AgentTaskId): Promise<Option<AgentTask>>;
  listByTenant(tenantId: TenantId): Promise<readonly AgentTask[]>;
  listPending(): Promise<readonly AgentTask[]>;
  save(task: AgentTask): Promise<void>;
  delete(task: AgentTask): Promise<void>;
}
