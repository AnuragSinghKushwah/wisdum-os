import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { AgentTaskId } from '../value-objects/agent-task-ids.js';
import {
  AGENT_TASK_COMPLETED,
  AGENT_TASK_CREATED,
  AGENT_TASK_FAILED,
  type AnyAgentTaskEvent,
} from '../events/agent-task-events.js';

export interface CreateAgentTaskProps {
  readonly id: AgentTaskId;
  readonly tenantId: TenantId;
  readonly agentType: string;
  readonly payload: Record<string, any>;
}

export interface AgentTaskSnapshot {
  readonly id: AgentTaskId;
  readonly tenantId: TenantId;
  readonly agentType: string;
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly payload: Record<string, any>;
  readonly result?: Record<string, any> | null;
  readonly error?: string | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export class AgentTask extends AggregateRoot<AgentTaskId> {
  private readonly _tenantId: TenantId;
  private readonly _agentType: string;
  private _status: 'pending' | 'running' | 'completed' | 'failed';
  private readonly _payload: Record<string, any>;
  private _result?: Record<string, any> | null;
  private _error?: string | null;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: AgentTaskSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._agentType = snapshot.agentType;
    this._status = snapshot.status;
    this._payload = snapshot.payload;
    this._result = snapshot.result;
    this._error = snapshot.error;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  static create(props: CreateAgentTaskProps, clock: Clock): AgentTask {
    const now = clock.now();
    const task = new AgentTask({
      id: props.id,
      tenantId: props.tenantId,
      agentType: props.agentType,
      status: 'pending',
      payload: props.payload,
      createdAt: now,
      updatedAt: now,
    });
    task.raise({
      eventType: AGENT_TASK_CREATED,
      aggregateId: props.id,
      tenantId: props.tenantId,
      occurredAt: now,
      version: 1,
      payload: {
        agentTaskId: props.id.value(),
        agentType: props.agentType,
      },
    });
    return task;
  }

  static reconstitute(snapshot: AgentTaskSnapshot): AgentTask {
    return new AgentTask(snapshot);
  }

  startExecution(clock: Clock): void {
    if (this._status !== 'pending') {
      throw new Error(`Cannot start task from status: ${this._status}`);
    }
    this._status = 'running';
    this._updatedAt = clock.now();
  }

  complete(result: Record<string, any>, clock: Clock): void {
    const now = clock.now();
    this._status = 'completed';
    this._result = result;
    this._updatedAt = now;
    this.raise({
      eventType: AGENT_TASK_COMPLETED,
      aggregateId: this.getId(),
      tenantId: this.tenantId,
      occurredAt: now,
      version: 1,
      payload: {
        agentTaskId: this.getId().value(),
      },
    });
  }

  fail(errorMessage: string, clock: Clock): void {
    const now = clock.now();
    this._status = 'failed';
    this._error = errorMessage;
    this._updatedAt = now;
    this.raise({
      eventType: AGENT_TASK_FAILED,
      aggregateId: this.getId(),
      tenantId: this.tenantId,
      occurredAt: now,
      version: 1,
      payload: {
        agentTaskId: this.getId().value(),
        error: errorMessage,
      },
    });
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get agentType(): string {
    return this._agentType;
  }

  get status(): 'pending' | 'running' | 'completed' | 'failed' {
    return this._status;
  }

  get payload(): Record<string, any> {
    return this._payload;
  }

  get result(): Record<string, any> | null | undefined {
    return this._result;
  }

  get error(): string | null | undefined {
    return this._error;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  private raise(event: AnyAgentTaskEvent): void {
    this.addDomainEvent(event);
  }
}
