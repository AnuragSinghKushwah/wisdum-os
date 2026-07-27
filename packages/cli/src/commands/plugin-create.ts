import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface PluginCreateOptions {
  readonly name: string;
  readonly targetDir?: string;
}

export async function runPluginCreate(options: PluginCreateOptions): Promise<{ success: boolean; message: string }> {
  if (!options.name || options.name.trim().length === 0) {
    return { success: false, message: 'Plugin name is required' };
  }

  const slug = options.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const baseDir = options.targetDir ? resolve(options.targetDir, slug) : resolve(process.cwd(), 'plugins', slug);

  if (existsSync(baseDir)) {
    return { success: false, message: `Plugin directory ${baseDir} already exists.` };
  }

  mkdirSync(baseDir, { recursive: true });

  const manifest = {
    name: slug,
    displayName: options.name,
    version: '1.0.0',
    description: `Wisdum OS Plugin: ${options.name}`,
    capabilities: ['input_connector'],
    permissions: ['read_content'],
    entryPoint: 'index.js',
  };

  const code = `import { defineWisdumPlugin } from '@wisdum/plugin-sdk';

export default defineWisdumPlugin({
  manifest: ${JSON.stringify(manifest, null, 2)},
  setup: async (ctx) => {
    ctx.logger.info('${options.name} initialized successfully!');
  },
});
`;

  writeFileSync(resolve(baseDir, 'plugin.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  writeFileSync(resolve(baseDir, 'index.js'), code, 'utf-8');

  return {
    success: true,
    message: `Scaffolding created for plugin '${slug}' at ${baseDir}`,
  };
}
