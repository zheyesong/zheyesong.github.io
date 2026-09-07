import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 35_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.015,
    },
  },
  fullyParallel: false,
  updateSnapshots: 'none',
  use: {
    baseURL: 'http://127.0.0.1:4333',
    channel: process.env.CI ? undefined : 'chrome',
    colorScheme: 'light',
    locale: 'en-US',
    viewport: { width: 1200, height: 900 },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4333',
    port: 4333,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  // Font rasterization/metrics differ between macOS Chrome and Linux Chromium.
  snapshotPathTemplate: 'tests/__screenshots__/{platform}/{arg}{ext}',
});
