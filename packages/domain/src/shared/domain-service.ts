/**
 * Marker interface for domain services — stateless services that encapsulate
 * domain logic that does not naturally belong to a single aggregate or entity.
 *
 * Domain services coordinate between aggregates, check cross-aggregate
 * invariants, and orchestrate complex domain workflows — but never handle
 * infrastructure concerns (HTTP, persistence, external APIs).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DomainService {}
