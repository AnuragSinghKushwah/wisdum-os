import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInit } from '../commands/init.js';
import { runPluginCreate } from '../commands/plugin-create.js';

describe('Wisdum CLI Commands', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'wisdum-cli-test-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('runInit writes the configuration file into the requested directory', async () => {
    const res = await runInit({ tenantId: 'test-tenant-123', cwd: workDir });
    expect(res.success).toBe(true);
    expect(res.message).toContain('Initialized Wisdum configuration');

    const written = JSON.parse(readFileSync(join(workDir, '.wisdumrc.json'), 'utf-8')) as {
      tenantId: string;
    };
    expect(written.tenantId).toBe('test-tenant-123');
  });

  it('runInit refuses to overwrite an existing configuration without force', async () => {
    await runInit({ tenantId: 'first', cwd: workDir });

    const refused = await runInit({ tenantId: 'second', cwd: workDir });
    expect(refused.success).toBe(false);
    expect(refused.message).toContain('already exists');

    const forced = await runInit({ tenantId: 'second', cwd: workDir, force: true });
    expect(forced.success).toBe(true);
    const written = JSON.parse(readFileSync(join(workDir, '.wisdumrc.json'), 'utf-8')) as {
      tenantId: string;
    };
    expect(written.tenantId).toBe('second');
  });

  it('runPluginCreate requires plugin name', async () => {
    const res = await runPluginCreate({ name: '' });
    expect(res.success).toBe(false);
    expect(res.message).toContain('Plugin name is required');
  });

  it('runPluginCreate generates plugin scaffold directory', async () => {
    const res = await runPluginCreate({ name: 'Test Plugin', targetDir: workDir });
    expect(res.success).toBe(true);
    expect(res.message).toContain("Scaffolding created for plugin 'test-plugin'");
    expect(existsSync(join(workDir, 'test-plugin', 'plugin.json'))).toBe(true);
    expect(existsSync(join(workDir, 'test-plugin', 'index.js'))).toBe(true);
  });
});
