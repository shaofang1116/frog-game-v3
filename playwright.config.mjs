import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    browserName: 'chromium'
  },
  projects: [
    {
      name: 'chromium'
    }
  ],
  webServer: {
    command: 'http-server . -p 4173 -c-1',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI
  }
});
