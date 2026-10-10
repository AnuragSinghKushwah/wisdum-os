#!/usr/bin/env node
/**
 * Runs Wisdum on this machine: makes sure a .env exists, starts Postgres and Redis
 * with Docker when .env points at local ones that are not running, then runs the API
 * and the web app together. Ctrl-C stops everything.
 *
 *   npm run local               # normal run
 *   npm run local -- --signup   # also lets you create an account (first run, or when sign-up says it is closed)
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);

const allowSignup = process.argv.includes('--signup');

const run = (command, args) => spawnSync(command, args, { stdio: 'inherit', cwd: root });

function valueOf(text, name) {
  const match = new RegExp(`^${name}=(.*)$`, 'm').exec(text);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

function canConnect(host, port) {
  return new Promise((done) => {
    const socket = createConnection({ host, port, timeout: 1500 });
    socket.once('connect', () => (socket.destroy(), done(true)));
    socket.once('error', () => done(false));
    socket.once('timeout', () => (socket.destroy(), done(false)));
  });
}

async function waitFor(host, port, seconds) {
  for (let i = 0; i < seconds; i += 1) {
    if (await canConnect(host, port)) return true;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  return false;
}

async function ensureLocalService(label, url) {
  if (url.length === 0) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  const port = Number(parsed.port || (parsed.protocol.startsWith('redis') ? 6379 : 5432));
  if (!local || (await canConnect(parsed.hostname, port))) return;

  console.log(`${label} is not running on ${parsed.hostname}:${port}; starting it with Docker...`);
  const docker = spawnSync('docker', ['info'], { stdio: 'ignore' });
  if (docker.status !== 0) {
    console.error(
      `\nDocker is not running, so ${label} cannot be started.\n` +
        '  - Start Docker Desktop and run this again, or\n' +
        `  - remove ${label === 'Postgres' ? 'DATABASE_URL' : 'REDIS_URL'} from .env to run with data kept in memory only.\n`,
    );
    process.exit(1);
  }
  // --wait returns once the container's health check passes, not merely when the port is open.
  run('docker', ['compose', 'up', '-d', '--wait', label === 'Postgres' ? 'postgres' : 'redis']);
  if (!(await waitFor(parsed.hostname, port, 60))) {
    console.error(`${label} did not become reachable on port ${port}.`);
    process.exit(1);
  }
}

run('node', ['tools/setup/setup.mjs']);

const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
await ensureLocalService('Postgres', process.env.DATABASE_URL ?? valueOf(env, 'DATABASE_URL'));
await ensureLocalService('Redis', process.env.REDIS_URL ?? valueOf(env, 'REDIS_URL'));

const children = [
  ['api', 'npm', ['run', 'dev:api']],
  ['web', 'npm', ['run', 'dev:web']],
].map(([name, command, args]) => {
  // Own process group, so stopping can reach the server `npm` starts, not just `npm` itself.
  const childEnv = {
    ...process.env,
    // The API listens on this machine only, so nobody else on the network can reach it or spend your model key.
    ...(name === 'api' ? { HOST: process.env.HOST ?? '127.0.0.1' } : {}),
    ...(name === 'api' && allowSignup ? { WISDUM_ALLOW_SIGNUP: 'true' } : {}),
  };
  const child = spawn(command, args, { cwd: root, env: childEnv, detached: true });
  const forward = (stream, target) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim().length > 0) target.write(`[${name}] ${line}\n`);
      }
    });
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`[${name}] exited (${code ?? 'signal'}); stopping the rest`);
    stopAll();
  });
  return child;
});

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

console.log(
  '\nStarting Wisdum.  Web: http://localhost:3000   API: http://localhost:3001   (Ctrl-C to stop)',
);
console.log(
  allowSignup
    ? 'Sign-up is open for this run. Create your account at http://localhost:3000/sign-up, then restart without --signup.\n'
    : 'First time? Sign up at http://localhost:3000/sign-up. If it says sign-up is closed, run: npm run local -- --signup\n',
);
