import { defineConfig } from '@playwright/test';

const browserChannel = process.env.TAT_SMOKE_CHANNEL
  || (process.platform === 'win32' ? 'msedge' : undefined);

export default defineConfig({
  testDir: './tests/smoke',
  testMatch: '**/*.spec.mjs',
  timeout: 30_000,
  expect: { timeout: 18_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: '.tools/playwright-smoke-results',
  use: {
    baseURL: process.env.TAT_SMOKE_BASE_URL || 'https://tavola-comune.web.app',
    browserName: 'chromium',
    ...(browserChannel ? { channel: browserChannel } : {}),
    serviceWorkers: 'allow'
  }
});
