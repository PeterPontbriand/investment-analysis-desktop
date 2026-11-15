// `pnpm smoke`: does the setup steps of
// docs/project/SMOKE_TESTING.md, writes a pre-filled record, and starts the
// application against the throwaway database.
import { readFileSync, writeFileSync } from 'node:fs';
import { arch, platform, release, type } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSteps } from './document.ts';
import { fileSystem, run, startApplication } from './process.ts';
import { renderRecord, type RecordInput } from './record.ts';
import { runSmoke } from './run.ts';
import type { Session } from './setup.ts';

const repositoryRoot = resolve(
  fileURLToPath(new URL('../..', import.meta.url)),
);

function localDate(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const offset = -now.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const hours = pad(Math.floor(Math.abs(offset) / 60));
  const minutes = pad(Math.abs(offset) % 60);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} (UTC${sign}${hours}:${minutes})`;
}

async function applicationCommit(): Promise<{
  commit: string;
  dirty: boolean;
}> {
  const head = await run('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: repositoryRoot,
  });
  const changes = await run('git', ['status', '--porcelain'], {
    cwd: repositoryRoot,
  });
  return {
    commit: head.stdout.trim() || 'unknown',
    dirty: changes.stdout.trim() !== '',
  };
}

async function writeRecord(
  session: Session,
  now: Date,
  stopped: { step: string; message: string } | null,
): Promise<string | null> {
  if (session.throwawayFolder === null) return null;
  const application = await applicationCommit();
  const input: RecordInput = {
    date: localDate(now),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    operatingSystem: `${type()} ${release()} (${platform()} ${arch()})`,
    applicationCommit: application.commit,
    dirty: application.dirty,
    engineCommit: session.engineCommit,
    ianSource: session.ianSource,
    engineVersion: session.engineVersion,
    engineUncommitted: session.engineUncommitted,
    engineSwitch:
      session.engineSwitch === null
        ? null
        : { start: session.engineSwitch.start },
    data: session.data,
    throwawayFolder: session.throwawayFolder,
    steps: parseSteps(
      readFileSync(
        join(repositoryRoot, 'docs', 'project', 'SMOKE_TESTING.md'),
        'utf8',
      ),
    ),
    scripted: session.scripted,
    log: session.log,
    stopped,
  };
  const path = join(repositoryRoot, session.throwawayFolder, 'SMOKE_RECORD.md');
  writeFileSync(path, renderRecord(input), 'utf8');
  return path;
}

const now = new Date();

process.exitCode = await runSmoke(
  {
    setup: {
      run,
      runToCompletion: run,
      fs: fileSystem,
      env: process.env,
      platform: process.platform,
      repositoryRoot,
      now,
      progress: (line) => process.stdout.write(`${line}\n`),
    },
    signals: process,
    startApplication: (env) => startApplication(repositoryRoot, env),
    writeRecord: (session, stopped) => writeRecord(session, now, stopped),
    print: (text) => process.stdout.write(text),
    printError: (text) => process.stderr.write(text),
    exit: (code) => process.exit(code),
  },
  process.argv.slice(2),
);
