import { defineConfig, devices } from '@playwright/test';
import { appPort } from './tests/browser/engine/port.ts';

// The real-engine suite (`pnpm test:engine`): the browser-test build against a
// real `ian serve` on a throwaway database. It needs the network and the engine
// installed, so it is not part of `pnpm gate` or CI. See
// tests/browser/engine/README.md.
const timezoneId = 'America/Toronto';

export default defineConfig({
  testDir: './tests/browser/engine',
  globalSetup: './tests/browser/engine/global-setup.ts',
  reporter: [['list']],
  // Each project's worker starts its own engine and data, and the providers are
  // real, so tests do not run in parallel within a project.
  workers: 2,
  fullyParallel: false,
  timeout: 90_000,
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
  use: { baseURL: `http://127.0.0.1:${appPort}` },
  webServer: {
    command: `pnpm exec vite build --mode browser-test && pnpm exec vite preview --outDir dist-browser-test --host 127.0.0.1 --port ${appPort} --strictPort`,
    url: `http://127.0.0.1:${appPort}`,
    // A server left running would serve an old build.
    reuseExistingServer: false,
  },
});
