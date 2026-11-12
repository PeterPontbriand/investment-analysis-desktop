import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], locale: 'en-US' },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], locale: 'en-US' },
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
