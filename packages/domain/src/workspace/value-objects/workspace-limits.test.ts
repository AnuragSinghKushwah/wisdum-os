import { describe, expect, it } from 'vitest';
import { WorkspaceLimits } from './workspace-limits.js';

describe('WorkspaceLimits', () => {
  it('unlimited() allows any member count', () => {
    const limits = WorkspaceLimits.unlimited();
    expect(limits.allowsMemberCount(1_000_000)).toBe(true);
    expect(limits.maxMembers).toBeUndefined();
  });

  it('a configured maxMembers is enforced', () => {
    const limits = WorkspaceLimits.create({ maxMembers: 5 });
    expect(limits.allowsMemberCount(5)).toBe(true);
    expect(limits.allowsMemberCount(6)).toBe(false);
  });

  it('rejects a negative or non-integer limit', () => {
    expect(() => WorkspaceLimits.create({ maxMembers: -1 })).toThrow();
    expect(() => WorkspaceLimits.create({ maxMembers: 1.5 })).toThrow();
  });

  it('two limits with the same values are equal', () => {
    const a = WorkspaceLimits.create({ maxMembers: 5, maxStorageBytes: 100 });
    const b = WorkspaceLimits.create({ maxMembers: 5, maxStorageBytes: 100 });
    expect(a.equals(b)).toBe(true);
  });
});
