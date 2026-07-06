# @wisdum/events

Exposes exactly three interfaces — `Event`, `EventHandler`, `EventBus` — and no implementation. Cross-package communication flows through these interfaces; transports are provided by the platform layer or broker plugins under a future ADR.

## Boundaries

- Depends on `@wisdum/types` and `@wisdum/contracts`.
- No transport, persistence, or delivery logic here, ever.
