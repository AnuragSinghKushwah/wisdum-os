import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { AgentTaskId } from '@wisdum/domain';
import type { Clock, AgentTaskRepository, AgentTask } from '@wisdum/domain';
import type { DomainEventPublisher, IdGenerator } from '../../../shared/ports.js';
import { CreateAgentTaskHandler } from '../create-agent-task-handler.js';
import { createAgentTaskCommand } from '../../commands/create-agent-task-command.js';

const TENANT_ID = 'tenant-agent-test' as TenantId;
const clock: Clock = { now: () => '2026-07-24T12:00:00.000Z' as IsoTimestamp };
const ids: IdGenerator = { nextId: () => '00000000-0000-0000-0000-000000000001' as UUID };
const events: DomainEventPublisher = { publishAll: () => Promise.resolve() };

class FakeAgentTaskRepository implements AgentTaskRepository {
  private readonly items = new Map<string, AgentTask>();

  async findById(id: AgentTaskId): Promise<Option<AgentTask>> {
    const item = this.items.get(id.value());
    return item ? { some: true, value: item } : { some: false };
  }

  async listByTenant(tenantId: TenantId): Promise<readonly AgentTask[]> {
    return Array.from(this.items.values()).filter((item) => item.tenantId === tenantId);
  }

  async listPending(): Promise<readonly AgentTask[]> {
    return Array.from(this.items.values()).filter((item) => item.status === 'pending');
  }

  async save(task: AgentTask): Promise<void> {
    this.items.set(task.getId().value(), task);
  }

  async delete(task: AgentTask): Promise<void> {
    this.items.delete(task.getId().value());
  }
}

describe('CreateAgentTaskHandler', () => {
  it('creates a new agent task aggregate and saves it', async () => {
    const repo = new FakeAgentTaskRepository();
    const handler = new CreateAgentTaskHandler(repo, ids, events, clock);

    const { taskId } = await handler.execute(
      createAgentTaskCommand({
        tenantId: TENANT_ID,
        agentType: 'writing',
        payload: { opportunityId: 'opp-1' },
      }),
    );

    expect(taskId).toBe('00000000-0000-0000-0000-000000000001');
    const saved = await repo.findById(AgentTaskId.create(taskId as UUID));
    expect(saved.some).toBe(true);
    if (saved.some) {
      expect(saved.value.agentType).toBe('writing');
      expect(saved.value.status).toBe('pending');
    }
  });
});
