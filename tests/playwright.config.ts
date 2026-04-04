import { defineConfig, devices } from '@playwright/test';

/**
 * KairoLogic Deep QA Test Suite — Playwright Configuration
 *
 * Run:
 *   npx playwright test --config=tests/playwright.config.ts
 *   npx playwright test --config=tests/playwright.config.ts --project=smoke
 *   npx playwright test --config=tests/playwright.config.ts --project=desktop
 */

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  use: {
    headless: true,
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop',
      testMatch: /\.(spec|test)\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: /\.(spec|test)\.ts$/,
      use: { ...devices['Pixel 5'] },
    },
  ],

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../tests/results/html-report' }],
    ['json', { outputFile: '../tests/results/test-results.json' }],
  ],

  outputDir: './results/artifacts',

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
