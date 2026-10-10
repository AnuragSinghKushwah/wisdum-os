import { loadEnvFile } from './load-env-file.js';

/**
 * Imported first by the entry point so `.env` is applied before any other
 * module reads configuration. Looks in the working directory, then at the
 * repository root (`npm run dev --workspace` starts the API from `apps/api`).
 */
loadEnvFile(['.env', '../../.env']);
