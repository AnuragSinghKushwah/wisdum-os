import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadEnvFile } from './load-env-file.js';

describe('loadEnvFile', () => {
  let dir: string;
  const touched = ['WISDUM_TEST_FROM_FILE', 'WISDUM_TEST_ALREADY_SET', 'WISDUM_TEST_EMPTY'];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'wisdum-env-'));
    for (const key of touched) delete process.env[key];
  });

  afterEach(() => {
    for (const key of touched) delete process.env[key];
    rmSync(dir, { recursive: true, force: true });
  });

  function envFile(contents: string): string {
    const path = join(dir, '.env');
    writeFileSync(path, contents);
    return path;
  }

  it('loads values from the file and reports which file it used', () => {
    const path = envFile('WISDUM_TEST_FROM_FILE=hello\n');

    expect(loadEnvFile([join(dir, 'missing.env'), path])).toBe(path);
    expect(process.env['WISDUM_TEST_FROM_FILE']).toBe('hello');
  });

  it('never overrides a variable that is already set, even an empty one', () => {
    process.env['WISDUM_TEST_ALREADY_SET'] = 'from-shell';
    process.env['WISDUM_TEST_EMPTY'] = '';
    const path = envFile('WISDUM_TEST_ALREADY_SET=from-file\nWISDUM_TEST_EMPTY=from-file\n');

    loadEnvFile([path]);

    expect(process.env['WISDUM_TEST_ALREADY_SET']).toBe('from-shell');
    expect(process.env['WISDUM_TEST_EMPTY']).toBe('');
  });

  it('does nothing when no file exists', () => {
    expect(loadEnvFile([join(dir, 'nope.env')])).toBeUndefined();
  });

  it('does nothing in production, even when a file is present', () => {
    const path = envFile('WISDUM_TEST_FROM_FILE=hello\n');

    expect(loadEnvFile([path], { NODE_ENV: 'production' })).toBeUndefined();
    expect(process.env['WISDUM_TEST_FROM_FILE']).toBeUndefined();
  });
});
