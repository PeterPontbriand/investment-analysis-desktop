import { platform } from 'node:process';

const applicationBinaryPath =
  platform === 'win32'
    ? './src-tauri/target/debug/investment-analysis-desktop.exe'
    : './src-tauri/target/debug/investment-analysis-desktop';

export const config = {
  runner: 'local',
  specs: ['./tests/shell/**/*.spec.js'],
  maxInstances: 1,
  services: [
    [
      '@wdio/tauri-service',
      {
        appBinaryPath: applicationBinaryPath,
        driverProvider: 'embedded',
      },
    ],
  ],
  capabilities: [
    {
      browserName: 'tauri',
      'tauri:options': {
        application: applicationBinaryPath,
      },
    },
  ],
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 60_000 },
};
