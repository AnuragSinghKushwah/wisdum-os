# 0011 — Event delivery: in-process and Redis Pub/Sub buses

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. Implemented in `dad8b3d` (in-memory bus), `0b98fae` (Redis bus), and `8a89aa0` (SSE streaming). Rationale is reconstructed from the code and history.
- **Supersedes:** [ADR 0003](0003-core-technology-stack.md) (Celery as the async-processing mechanism)

## Context

[ADR 0003](0003-core-technology-stack.md) planned Redis plus Celery for queues and background processing. [ADR 0005](0005-core-runtime-language.md) made the core platform TypeScript, which rules Celery out. Domains still need to communicate through events, the API must run as more than one instance, and the web app wants live updates.

## Decision

- **Aggregates record events; handlers publish them.** Aggregates collect `PendingDomainEvent`s ([ADR 0007](0007-domain-driven-design.md)). After persisting, a handler passes the pulled events to `DomainEventPublisher`. `EventBusDomainEventPublisher` assigns each event an id, maps `eventType` to the envelope's `name`, and publishes an `Event` (`@wisdum/events`) onto the `EventBus`.
- **Two buses behind the `EventBus` interface.** `InMemoryEventBus` is the default: it dispatches to subscribers in-process and, if any subscriber fails, `publish` rejects with an `AggregateError`. `RedisEventBus` is used when `REDIS_URL` is set: one Pub/Sub channel per event name (`wisdum:events:<name>`), on two connections because a subscribing Redis client cannot publish. Handler errors on the Redis path are logged, not thrown.
- **Realtime to browsers.** `GET /v1/events/stream` is a Server-Sent Events endpoint that bridges the `EventBus` to clients, forwards only events for the caller's tenant, and sends periodic heartbeats.
- **Background work is in-process.** `platform/jobs` provides an `IntervalScheduler`, wired into the API through `SchedulerModule`, and an in-process `QueueProcessor` that is not wired into the API. There is no external job queue.

## Consequences

- Domains stay decoupled: producers and consumers share only event names and payloads.
- **Delivery is weaker than the contract.** `EventHandler` in `@wisdum/events` promises at-least-once delivery and tells handlers to be idempotent. The Redis bus is fire-and-forget (at-most-once): a subscriber that is offline when an event is published never receives it. The `Outbox` port that would provide durable, atomic publication exists, but only with an in-memory implementation.
- **Publication is not atomic with persistence.** Events are published after the state change is stored, so a crash between the two loses events. With the in-memory bus, a failing subscriber makes `publish` reject after the state was already persisted, so the caller sees an error for a change that did commit.
- The SSE endpoint falls back to the subscriber's own tenant when an event carries no tenant id. `Event.tenantId` is required by type, so this is a defensive default, but it would leak if an untyped producer omitted it.
- Long-running or durable background jobs have no home yet; the first feature that needs them requires a queue decision (Redis streams, BullMQ, or similar) and its own ADR.

## Alternatives considered

- **Celery.** Not applicable after ADR 0005.
- **Kafka or NATS.** Not taken; [ADR 0003](0003-core-technology-stack.md) already judged a broker premature, and the `EventBus` interface leaves room for one.
- **Redis Streams for the bus.** Would provide durable, consumer-group delivery and is the natural next step toward at-least-once semantics.
