/**
 * Resolves the database URL integration tests should run against. Tests
 * that use this skip themselves (via `describe.skipIf`) when it's unset,
 * rather than failing — a real Postgres instance is an external
 * dependency, not something every environment running the unit suite has.
 */
export function resolveTestDatabaseUrl(): string | undefined {
  const url = process.env.TEST_DATABASE_URL;
  return url !== undefined && url.trim().length > 0 ? url : undefined;
}
