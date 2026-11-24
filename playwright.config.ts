import { defineConfig, devices } from '@playwright/test';

// Dates are checked in this zone, so a date-only value formatted in local time fails.
const timezoneId = 'America/Toronto';

// On main, CI_MAIN=1 runs quarantined tests, retries a failed test once so that a
// test passing on retry is reported as flaky, and writes a JSON report for CI.
const onMain = process.env.CI_MAIN === '1';

export default defineConfig({
  testDir: './tests/browser',
  // The real-engine suite has its own config (playwright.engine.config.ts).
  testIgnore: ['**/engine/**'],
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ...(onMain
      ? ([['json', { outputFile: 'playwright-results.json' }]] as const)
      : []),
  ],
  ...(onMain ? { retries: 1 } : { grepInvert: /@quarantine/ }),
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
