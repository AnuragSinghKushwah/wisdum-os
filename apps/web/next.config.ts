import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see apps/web/Dockerfile).
  // Pinned explicitly: an unrelated lockfile above the repo on this machine
  // otherwise makes Next infer the wrong monorepo root for file tracing.
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
