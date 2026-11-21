// `pnpm sandbox`: makes a throwaway database with sample data and starts the
// application against it, so the application can be tried without touching a
// real database.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileSystem, run } from '../engine/process.ts';
import { startApplication } from './application.ts';
import { runSandbox } from './run.ts';

const repositoryRoot = resolve(
  fileURLToPath(new URL('../..', import.meta.url)),
);

process.exitCode = await runSandbox(
  {
    setup: {
      run,
      runToCompletion: run,
      fs: fileSystem,
      env: process.env,
      platform: process.platform,
      repositoryRoot,
      now: new Date(),
      progress: (line) => process.stdout.write(`${line}\n`),
    },
    signals: process,
    startApplication: (env) => startApplication(repositoryRoot, env),
    print: (text) => process.stdout.write(text),
    printError: (text) => process.stderr.write(text),
    exit: (code) => process.exit(code),
  },
  process.argv.slice(2),
);
