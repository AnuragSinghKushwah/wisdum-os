import type { AgentTask, AgentTaskId } from '@wisdum/domain';
import { type AgentTaskRepository } from '@wisdum/domain';
import type { TenantId } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryAgentTaskRepository
  extends InMemoryRepository<AgentTaskId, AgentTask>
  implements AgentTaskRepository
{
  findBySlug(): never {
    throw new Error('AgentTask does not support slugs');
  }

  listByTenant(tenantId: TenantId): Promise<readonly AgentTask[]> {
    return Promise.resolve(this.values().filter((task) => task.tenantId === tenantId));
  }

  listPending(): Promise<readonly AgentTask[]> {
    return Promise.resolve(this.values().filter((task) => task.status === 'pending'));
  }
}
