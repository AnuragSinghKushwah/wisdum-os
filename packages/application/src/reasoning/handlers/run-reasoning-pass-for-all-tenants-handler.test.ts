import { describe, expect, it } from 'vitest';
import type { TenantId } from '@wisdum/types';
import type { TenantDirectory } from '../../shared/ports.js';
import type { ReasoningResultDto } from '../dto/reasoning-result-dto.js';
import type { RunReasoningPassCommand } from '../commands/run-reasoning-pass-command.js';
import { RunReasoningPassForAllTenantsHandler } from './run-reasoning-pass-for-all-tenants-handler.js';
import type { RunReasoningPassHandler } from './run-reasoning-pass-handler.js';

class FakeTenantDirectory implements TenantDirectory {
  constructor(private readonly tenantIds: readonly TenantId[]) {}
  listAllTenantIds(): Promise<readonly TenantId[]> {
    return Promise.resolve(this.tenantIds);
  }
}

function fakeResult(conceptsFound: number): ReasoningResultDto {
  return { conceptsFound, insightsCreated: 0, opportunitiesCreated: 0 };
}

describe('RunReasoningPassForAllTenantsHandler', () => {
  it('isolates one tenant failing: others still run and the failure is captured, not thrown', async () => {
    const tenantIds = ['tenant-1', 'tenant-2', 'tenant-3'] as TenantId[];
    const calls: TenantId[] = [];
    const runReasoningPass = {
      execute: (command: RunReasoningPassCommand) => {
        calls.push(command.tenantId);
        if (command.tenantId === 'tenant-2') {
          return Promise.reject(new Error('llm exploded'));
        }
        return Promise.resolve(fakeResult(calls.length));
      },
    } as unknown as RunReasoningPassHandler;

    const handler = new RunReasoningPassForAllTenantsHandler(
      new FakeTenantDirectory(tenantIds),
      runReasoningPass,
    );

    const { outcomes } = await handler.execute();

    expect(calls).toEqual(tenantIds);
    expect(outcomes).toHaveLength(3);
    expect(outcomes[0]).toMatchObject({ tenantId: 'tenant-1', status: 'ok' });
    expect(outcomes[1]).toMatchObject({ tenantId: 'tenant-2', status: 'error' });
    expect(outcomes[1]).toHaveProperty('error');
    expect(outcomes[2]).toMatchObject({ tenantId: 'tenant-3', status: 'ok' });
  });

  it('is a no-op when there are no tenants', async () => {
    const runReasoningPass = {
      execute: () => Promise.reject(new Error('should never be called')),
    } as unknown as RunReasoningPassHandler;

    const handler = new RunReasoningPassForAllTenantsHandler(
      new FakeTenantDirectory([]),
      runReasoningPass,
    );

    const { outcomes } = await handler.execute();

    expect(outcomes).toEqual([]);
  });
});
