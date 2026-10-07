# Domain: Agent

> Implemented in [`packages/domain/src/agent/`](../../packages/domain/src/agent/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md).

## Purpose

Tracks units of background work performed by autonomous agents on behalf of a tenant. An agent task records what was asked (`agentType` plus a free-form payload), where it is in its run, and how it ended. The context owns the task record only; the work itself is done by use cases in other contexts (drafting and publishing content).

## Entities

**AgentTask** (aggregate root) — identified by `AgentTaskId`, scoped to a tenant. Holds:

| State | Notes |
| --- | --- |
| `agentType` | A plain string. The domain does not constrain it; the HTTP layer accepts `writing` and `publishing`, and the executor rejects anything else. |
| `payload` | `Record<string, unknown>`, set at creation. |
| `status` | `pending`, `running`, `completed`, or `failed`. |
| `result` / `error` | Set when the task completes or fails. |
| `createdAt` / `updatedAt` | Supplied by the `Clock`. |

### Lifecycle

```
pending ──▶ running ──▶ completed
   │           │
   └───────────┴──────▶ failed
```

`create()` starts a task in `pending`. `startExecution()` moves `pending` to `running` and is the only transition that checks the current state. `complete()` and `fail()` set their status from any state.

### Invariants

- `AgentTaskId` must be a valid UUID (`ValidationError`).
- `startExecution()` refuses to run unless the task is `pending`. It throws a plain `Error`, not a `DomainError`.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `agent.task.created` | `AgentTask.create()` |
| `agent.task.completed` | `complete()` |
| `agent.task.failed` | `fail()` |

Payloads: `created` carries `agentTaskId` and `agentType`; `completed` carries `agentTaskId`; `failed` carries `agentTaskId` and `error`. `startExecution()` raises no event.

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `createAgentTaskCommand` and `executeAgentTaskCommand`, query `listAgentTasksQuery`, handled by `CreateAgentTaskHandler`, `ExecuteAgentTaskHandler`, and `ListAgentTasksHandler` in [`packages/application/src/agent/`](../../packages/application/src/agent/).

`ExecuteAgentTaskHandler` runs a `writing` task by generating a content draft for `payload.opportunityId`, and a `publishing` task by publishing the draft in `payload.draftId`. On any error it marks the task `failed`, persists it, publishes the events, and rethrows. `AgentModule` registers an `agent-task-runner` job on the scheduler that executes every `pending` task on each interval.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/v1/agents/tasks` | List the caller's tenant's tasks. |
| `POST` | `/v1/agents/tasks` | Create a task; responds `202` with the task id and `pending` status. |

Details and examples: [docs/api/agents.md](../api/agents.md). Routes are in `apps/api/src/routes/agent-routes.ts`.

## Persistence

`AgentTaskRepository` (`findById`, `listByTenant`, `listPending`, `save`, `delete`) has PostgreSQL and in-memory implementations. Table: `agent_tasks` (migration `0027_create_agent_tasks`).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`. The context has no specifications or domain services.

## Open questions

- `complete()` and `fail()` have no state guard. Running `ExecuteAgentTaskHandler` against a task that is already `completed` makes `startExecution()` throw, and the handler's error path then calls `fail()`, overwriting the finished task with a `failed` status. The scheduler only picks `pending` tasks, so this is reachable only by executing a task id directly.
- `agentType` is an unconstrained string in the domain, so the set of valid agent types is defined in the API validation schema and in the executor's branches rather than in the model.
- There is no retry or cancellation: a failed task stays `failed`.
