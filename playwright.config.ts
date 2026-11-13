import { defineConfig, devices } from '@playwright/test';

// Dates are checked in this zone, so a date-only value formatted in local time fails.
const timezoneId = 'America/Toronto';

export default defineConfig({
  testDir: './tests/browser',
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], locale: 'en-US', timezoneId },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], locale: 'en-US', timezoneId },
    },
  ],
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command:
      'pnpm exec vite build --mode browser-test && pnpm exec vite preview --outDir dist-browser-test --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
