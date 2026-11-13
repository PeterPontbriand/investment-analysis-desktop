import { resolve } from 'node:path';
import { env, platform } from 'node:process';

const applicationBinaryPath =
  platform === 'win32'
    ? './src-tauri/target/debug/investment-analysis-desktop.exe'
    : './src-tauri/target/debug/investment-analysis-desktop';

// The shell smoke test starts the stub engine instead of IAN (it runs on every
// CI platform without IAN); the application reads this variable at launch.
const stubEngineName = platform === 'win32' ? 'stub-engine.exe' : 'stub-engine';
env.IAD_IAN_PATH = resolve('src-tauri', 'target', 'debug', stubEngineName);

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
