import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Aliases every `@wisdum/*` package to its `src/index.ts` so tests run
 * directly against source — no build step required, and no risk of a
 * stale `dist/` masking a real failure.
 */
function collectWorkspaceAliases(workspaceDirs: readonly string[]): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const workspaceDir of workspaceDirs) {
    const absoluteDir = resolve(rootDir, workspaceDir);
    if (!existsSync(absoluteDir)) continue;
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packageJsonPath = resolve(absoluteDir, entry.name, 'package.json');
      const indexPath = resolve(absoluteDir, entry.name, 'src', 'index.ts');
      if (!existsSync(packageJsonPath) || !existsSync(indexPath)) continue;
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name: string };
      aliases[packageJson.name] = indexPath;
    }
  }
  return aliases;
}

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'platform/**/*.test.ts', 'apps/api/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: collectWorkspaceAliases(['packages', 'platform']),
  },
});
