import { defineConfig, devices } from '@playwright/test';

const mobile = process.env.TAT_I18N_DEVICE;
const useWebKit = mobile === 'iphone';

export default defineConfig({
  testDir: './tests/i18n-browser',
  timeout: 15000,
  expect: { timeout: 3000 },
  workers: 1,
  reporter: 'list',
  outputDir: mobile ? `.tools/playwright-i18n-${mobile}-results` : '.tools/playwright-i18n-results',
  use: {
    ...(mobile === 'iphone' ? devices['iPhone 13'] : mobile === 'android' ? devices['Pixel 7'] : {}),
    browserName: useWebKit ? 'webkit' : 'chromium',
    channel: useWebKit ? undefined : process.env.TAT_SMOKE_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    serviceWorkers: 'block'
  }
});
