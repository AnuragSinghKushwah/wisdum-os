import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface InitOptions {
  readonly tenantId?: string;
  readonly apiUrl?: string;
  readonly force?: boolean;
}

export async function runInit(options: InitOptions = {}): Promise<{ success: boolean; message: string }> {
  const targetPath = resolve(process.cwd(), '.wisdumrc.json');
  if (existsSync(targetPath) && !options.force) {
    return {
      success: false,
      message: '.wisdumrc.json configuration file already exists. Use --force to overwrite.',
    };
  }

  const config = {
    tenantId: options.tenantId ?? '00000000-0000-4000-8000-000000000001',
    apiUrl: options.apiUrl ?? 'http://localhost:3001',
    createdAt: new Date().toISOString(),
  };

  writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8');

  return {
    success: true,
    message: `Initialized Wisdum configuration at ${targetPath}`,
  };
}
