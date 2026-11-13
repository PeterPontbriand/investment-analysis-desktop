// `pnpm smoke --engine <engine checkout>`: does the setup steps of
// docs/project/SMOKE_TESTING.md, writes a pre-filled record, and starts the
// application against the throwaway database.
import { readFileSync, writeFileSync } from 'node:fs';
import { arch, platform, release, type } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { throwawayFile } from './commands.ts';
import { parseSteps } from './document.ts';
import { fileSystem, run, startApplication } from './process.ts';
import { renderRecord, type RecordInput } from './record.ts';
import {
  applicationEnvironment,
  newSession,
  runSetup,
  type Session,
} from './setup.ts';
import { SmokeStop } from './types.ts';

const repositoryRoot = resolve(
  fileURLToPath(new URL('../..', import.meta.url)),
);

function engineArgument(argv: string[]): string | null {
  for (const [index, argument] of argv.entries()) {
    if (argument === '--engine') return argv[index + 1] ?? null;
    if (argument.startsWith('--engine=')) return argument.slice(9) || null;
  }
  return null;
}

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
    enginePath: session.ianPath,
    ianSource: session.ianSource,
    engineVersion: session.engineVersion,
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

async function main(): Promise<number> {
  const engine = engineArgument(process.argv.slice(2));
  if (engine === null) {
    process.stderr.write(
      'Usage: pnpm smoke --engine <your engine checkout>\n--engine is required: the folder of the engine checkout at the commit in vendor/ian/SOURCE.md.\n',
    );
    return 1;
  }
  const enginePath = resolve(engine);
  const now = new Date();
  const session = newSession();
  try {
    await runSetup(
      {
        run,
        fs: fileSystem,
        env: process.env,
        platform: process.platform,
        repositoryRoot,
        enginePath,
        now,
        progress: (line) => process.stdout.write(`${line}\n`),
      },
      session,
    );
  } catch (error) {
    if (!(error instanceof SmokeStop)) throw error;
    process.stderr.write(
      `Smoke test stopped at ${error.step}: ${error.message}\n`,
    );
    const path = await writeRecord(session, now, {
      step: error.step,
      message: error.message,
    });
    if (path) process.stderr.write(`The record so far is in ${path}\n`);
    return 1;
  }
  session.scripted.set('Step 10', {
    fact: 'the tool started the application; mark whether its window opened',
    leftToYou: true,
  });
  const path = await writeRecord(session, now, null);
  const folder = session.throwawayFolder ?? '';
  process.stdout.write(
    `The record is ${path}\nClean-up will delete these files in ${folder}, and leave the folder and the record: ${throwawayFile}, ${throwawayFile}-wal, ${throwawayFile}-shm\nStarting the application…\n`,
  );
  return startApplication(
    repositoryRoot,
    applicationEnvironment(process.env, session),
  );
}

process.exitCode = await main();
