import { describe, expect, it } from 'vitest';
import { runInit } from '../commands/init.js';
import { runPluginCreate } from '../commands/plugin-create.js';

describe('Wisdum CLI Commands', () => {
  it('runInit generates configuration result object', async () => {
    const res = await runInit({ tenantId: 'test-tenant-123', force: true });
    expect(res.success).toBe(true);
    expect(res.message).toContain('Initialized Wisdum configuration');
  });

  it('runPluginCreate requires plugin name', async () => {
    const res = await runPluginCreate({ name: '' });
    expect(res.success).toBe(false);
    expect(res.message).toContain('Plugin name is required');
  });

  it('runPluginCreate generates plugin scaffold directory', async () => {
    const targetDir = `./.temp-test-plugins-${Date.now()}`;
    const res = await runPluginCreate({ name: 'Test Plugin', targetDir });
    expect(res.success).toBe(true);
    expect(res.message).toContain("Scaffolding created for plugin 'test-plugin'");
  });
});
