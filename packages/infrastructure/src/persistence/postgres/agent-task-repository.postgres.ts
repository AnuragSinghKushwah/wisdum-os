import {
  AgentTask,
  AgentTaskId,
  type AgentTaskRepository,
} from '@wisdum/domain';
import type { AgentTaskSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { AgentTaskRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: AgentTaskRow): AgentTaskSnapshot {
  return {
    id: AgentTaskId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    agentType: row.agent_type,
    status: row.status as "pending" | "running" | "completed" | "failed",
    payload: row.payload as Record<string, unknown>,
    result: row.result as Record<string, unknown> | null,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresAgentTaskRepository implements AgentTaskRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: AgentTaskId): Promise<Option<AgentTask>> {
    const result = await this.pool.query<AgentTaskRow>(
      'SELECT * FROM agent_tasks WHERE id = $1',
      [id.value()],
    );
    const row = result.rows[0];
    return row === undefined ? none : some(AgentTask.reconstitute(toSnapshot(row)));
  }

  async listByTenant(tenantId: TenantId): Promise<readonly AgentTask[]> {
    const result = await this.pool.query<AgentTaskRow>(
      'SELECT * FROM agent_tasks WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId],
    );
    return result.rows.map((row) => AgentTask.reconstitute(toSnapshot(row)));
  }

  async listPending(): Promise<readonly AgentTask[]> {
    const result = await this.pool.query<AgentTaskRow>(
      "SELECT * FROM agent_tasks WHERE status = 'pending' ORDER BY created_at ASC",
    );
    return result.rows.map((row) => AgentTask.reconstitute(toSnapshot(row)));
  }

  async save(task: AgentTask): Promise<void> {
    await this.pool.query(
      `INSERT INTO agent_tasks (
         id, tenant_id, agent_type, status, payload, result, error, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         result = EXCLUDED.result,
         error = EXCLUDED.error,
         updated_at = EXCLUDED.updated_at`,
      [
        task.getId().value(),
        task.tenantId,
        task.agentType,
        task.status,
        task.payload,
        task.result ?? null,
        task.error ?? null,
        task.createdAt,
        task.updatedAt,
      ],
    );
  }

  async delete(task: AgentTask): Promise<void> {
    await this.pool.query('DELETE FROM agent_tasks WHERE id = $1', [task.getId().value()]);
  }
}
