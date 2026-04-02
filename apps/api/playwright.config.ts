import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// Load test environment variables from .env.test and .env.test.local
// .env.test.local has priority (for local secrets, not committed to git)
if (existsSync('.env.test.local')) {
  config({ path: '.env.test.local' });
}
config({ path: '.env.test' });

const PORT = process.env.PORT || '13000';

// TEST_DATABASE_URL is required to ensure we don't accidentally run tests against production database
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is not set');

const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'e2e/**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30000,
  outputDir: './e2e-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'API Tests',
      testMatch: 'e2e/**/*.spec.ts',
    },
  ],
  webServer: {
    // Use production build for E2E tests to test against production-like environment
    // In CI, build step runs before E2E tests, so dist/ will exist
    // For local development, run `pnpm build` first
    command: process.env.CI ? `pnpm start:prod` : `pnpm run dev`,
    stdout: 'pipe',
    stderr: 'pipe',
    url: `${baseURL}/health`,
    // Always start a fresh server to ensure correct APP_ENV=test configuration.
    // Reusing an existing server (e.g. a dev server with APP_ENV=local) causes
    // auth failures because requireEmailVerification would be enabled.
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      // Proxying all environment variables from .env.test
      ...process.env,
      // NODE_ENV must be 'development' or 'production' (not 'test')
      // Set based on the command being run
      NODE_ENV: process.env.CI ? 'production' : 'development',
      APP_ENV: 'test',
      PORT,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  },
});
