import { platform } from 'node:process';

export const config = {
  runner: 'local',
  specs: ['./tests/shell/**/*.spec.js'],
  maxInstances: 1,
  services: [
    [
      '@wdio/tauri-service',
      {
        appBinaryPath:
          platform === 'win32'
            ? './src-tauri/target/debug/investment-analysis-desktop.exe'
            : './src-tauri/target/debug/investment-analysis-desktop',
        driverProvider: 'embedded',
      },
    ],
  ],
  capabilities: [
    {
      browserName: 'tauri',
      'tauri:options': {
        application:
          platform === 'win32'
            ? './src-tauri/target/debug/investment-analysis-desktop.exe'
            : './src-tauri/target/debug/investment-analysis-desktop',
      },
    },
  ],
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 60_000 },
};
