import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/tests/merge-reports',
  workers: 1,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report/merge-reports' }]],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
