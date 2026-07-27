#!/usr/bin/env node

import { runInit } from './commands/init.js';
import { runPluginCreate } from './commands/plugin-create.js';
import { runSync } from './commands/sync.js';
import { runStatus } from './commands/status.js';

export { runInit, runPluginCreate, runSync, runStatus };

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Wisdum OS — Developer Command-Line Interface (CLI)

Usage:
  wisdum <command> [options]

Commands:
  init            Initialize a new .wisdumrc.json configuration file
  plugin create   Scaffold a new plugin structure
  sync            Trigger connector synchronization
  status          Check Wisdum API health status

Examples:
  npx wisdum init
  npx wisdum plugin create "Slack Ingestion"
  npx wisdum sync --connector github
  npx wisdum status
`);
    return;
  }

  if (command === 'init') {
    const res = await runInit({});
    console.log(res.message);
    process.exit(res.success ? 0 : 1);
  }

  if (command === 'plugin' && args[1] === 'create') {
    const name = args[2] ?? 'custom-plugin';
    const res = await runPluginCreate({ name });
    console.log(res.message);
    process.exit(res.success ? 0 : 1);
  }

  if (command === 'sync') {
    const res = await runSync({});
    console.log(res.message);
    process.exit(res.success ? 0 : 1);
  }

  if (command === 'status') {
    const res = await runStatus({});
    console.log(res.message);
    process.exit(res.success ? 0 : 1);
  }

  console.error(`Unknown command: ${command}. Run 'wisdum --help' for available commands.`);
  process.exit(1);
}

// Only execute main if invoked directly as a binary
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
