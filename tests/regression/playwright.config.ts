import { defineConfig } from '@playwright/test';

/**
 * Lightweight Playwright config for regression tests.
 * No browser, no web server — pure Node.js file/API assertions.
 */
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  // No webServer, no browser projects — these are pure Node tests
  projects: [
    {
      name: 'regression',
      testMatch: /\.test\.ts$/,
    },
  ],
});
