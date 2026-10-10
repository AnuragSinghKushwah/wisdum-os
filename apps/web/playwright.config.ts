import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev:api',
      cwd: '../../',
      // Creates the development account the "Quick Dev Sign In" button signs in as. The empty values
      // keep the run hermetic: they win over a developer's `.env`, so the tests always use in-memory
      // storage and the offline mock model, never a local database or a real API key.
      env: {
        WISDUM_DEV_SEED: 'true',
        DATABASE_URL: '',
        REDIS_URL: '',
        ANTHROPIC_API_KEY: '',
        OPENAI_API_KEY: '',
        GEMINI_API_KEY: '',
        GOOGLE_API_KEY: '',
        OLLAMA_HOST: '',
      },
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: 'npm run dev:web',
      cwd: '../../',
      env: { NEXT_PUBLIC_WISDUM_DEV_SEED: 'true' },
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
