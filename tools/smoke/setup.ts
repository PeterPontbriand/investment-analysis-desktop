// The smoke test's scripted setup steps (Steps 1 to 9 of docs/project/SMOKE_TESTING.md).
// Each step stops with a plain message instead of guessing.
import { join, relative } from 'node:path';
import { readCommands, setupCommands, throwawayFile } from './commands.ts';
import { scrub, type ScriptedStep } from './record.ts';
import { readEngineVersion, readVendoredCommit, resolveIan } from './source.ts';
import {
  SmokeStop,
  type FileSystem,
  type RunResult,
  type Runner,
} from './types.ts';

export type Environment = Record<string, string | undefined>;

export type Dependencies = {
  run: Runner;
  fs: FileSystem;
  env: Environment;
  platform: string;
  repositoryRoot: string;
  enginePath: string;
  // The moment the throwaway folder is named after, in local time.
  now: Date;
  // Prints one progress line to standard output.
  progress: (line: string) => void;
};

// What the setup learned and did so far, kept even when a step stops it, so the
// record can show everything up to that point.
export type Session = {
  scripted: Map<string, ScriptedStep>;
  log: { command: string; output: string }[];
  engineCommit: string | null;
  ianPath: string | null;
  engineVersion: string | null;
  throwawayFolder: string | null;
  databaseUrl: string | null;
  data: {
    watchlists: number;
    entries: number;
    runs: number;
    refreshes: number;
  } | null;
};

export function newSession(): Session {
  return {
    scripted: new Map(),
    log: [],
    engineCommit: null,
    ianPath: null,
    engineVersion: null,
    throwawayFolder: null,
    databaseUrl: null,
    data: null,
  };
}

// The stop messages, which docs/project/SMOKE_TESTING.md lists with what to do.
export const stopMessages = {
  engineMissing: (path: string) =>
    `The engine folder ${path} does not exist. Pass the folder of your engine checkout: pnpm smoke --engine <your engine checkout>.`,
  notCheckout: (path: string) =>
    `${path} is not a Git checkout of the engine. Pass the folder of your engine checkout.`,
  wrongCommit: (path: string, found: string, wanted: string) =>
    `The engine checkout is at ${found}, but vendor/ian/SOURCE.md names ${wanted}. Run \`git -C "${path}" checkout ${wanted}\`, then try again.`,
  ianNotExecutable: () =>
    'IAD_IAN_PATH names a .cmd or .bat file. The application and this tool start the engine without a shell, so IAD_IAN_PATH must name an executable (.exe), not a .cmd or .bat file.',
  noIan: () =>
    "The `ian` command was not found. Make it available as the engine's installation guide describes (Step 1 of docs/project/SMOKE_TESTING.md), or point IAD_IAN_PATH at it.",
  ianHelpFailed: (detail: string) =>
    `\`ian --help\` did not succeed (${detail}). Make the \`ian\` command available as the engine's installation guide describes (Step 1).`,
  databaseUnreadable: () =>
    "The state of your real database could not be read from `ian db status --json`. Run `ian db status` yourself and use the engine's Local Database Operations guide.",
  databaseNotReady: (state: string) =>
    state === 'upgrade_required'
      ? 'Your real database needs an upgrade. Follow "First use and explicit upgrades" in the engine\'s Local Database Operations guide before going on.'
      : `Your real database is in the state ${state}. Stop and use the engine's Local Database Operations guide.`,
  commandFailed: (step: string, command: string, detail: string) =>
    `${step} failed: \`ian ${command}\` ${detail}. Its output is in the record.`,
  noCompletedRun: () =>
    "The refresh completed no run, so the screens would have nothing to show. Check the providers with `ian health` and the engine's troubleshooting guide, then try again.",
  wrongCounts: (found: string) =>
    `The setup should leave 5 runs, 1 refresh of 4 runs and 2 watchlists with 4 entries in all, but found ${found}. Use a new throwaway database: run pnpm smoke again.`,
} as const;

// One line when each of Steps 4 to 9 starts. Steps that call the data providers say so.
const progressLines: Record<string, string> = {
  'Step 4': "Step 4: creating the throwaway database's schema…",
  'Step 5': 'Step 5: creating the Smoke Test and Smoke Test Empty watchlists…',
  'Step 6': 'Step 6: adding four entries to the Smoke Test watchlist…',
  'Step 7':
    'Step 7: refreshing the Smoke Test watchlist (this calls the data providers and can take a few minutes)…',
  'Step 8':
    'Step 8: saving one direct analysis of MSFT (this calls the data providers and can take a minute)…',
  'Step 9':
    'Step 9: reading back the saved runs, refreshes and watchlists to check their counts…',
};

function describe(result: RunResult): string {
  return result.code === null
    ? 'could not be started'
    : `exited with status ${result.code}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

// yyyyMMdd-HHmmss in local time.
export function folderStamp(now: Date): string {
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// The URL as SMOKE_TESTING.md's Step 3 builds it.
export function databaseUrlFor(folder: string): string {
  return `sqlite:///${folder.split('\\').join('/')}/${throwawayFile}`;
}

export async function runSetup(
  deps: Dependencies,
  session: Session,
): Promise<void> {
  const { run, fs, repositoryRoot, progress } = deps;
  const logRun = (command: string, result: RunResult) =>
    session.log.push({
      command,
      output: scrub(`${result.stdout}${result.stderr}`, repositoryRoot),
    });

  // Step 1: the engine is the vendored commit, and `ian` runs.
  progress('Step 1: checking the engine checkout and the `ian` command…');
  if (!fs.exists(deps.enginePath))
    throw new SmokeStop('Step 1', stopMessages.engineMissing(deps.enginePath));
  const wanted = readVendoredCommit(
    fs.readText(join(repositoryRoot, 'vendor', 'ian', 'SOURCE.md')),
  );
  const head = await run('git', ['-C', deps.enginePath, 'rev-parse', 'HEAD']);
  logRun(`git -C <engine> rev-parse HEAD`, head);
  if (head.code !== 0)
    throw new SmokeStop('Step 1', stopMessages.notCheckout(deps.enginePath));
  const found = head.stdout.trim().toLowerCase();
  if (found !== wanted)
    throw new SmokeStop(
      'Step 1',
      stopMessages.wrongCommit(deps.enginePath, found, wanted),
    );
  session.engineCommit = found.slice(0, 7);
  const configured = deps.env.IAD_IAN_PATH;
  if (configured !== undefined && /\.(cmd|bat)$/i.test(configured))
    throw new SmokeStop('Step 1', stopMessages.ianNotExecutable());
  const ian = resolveIan(deps.env, deps.platform, (path) => fs.exists(path));
  if (ian === null) throw new SmokeStop('Step 1', stopMessages.noIan());
  session.ianPath = ian;
  const help = await run(ian, ['--help'], { env: deps.env });
  logRun('ian --help', help);
  if (help.code !== 0)
    throw new SmokeStop('Step 1', stopMessages.ianHelpFailed(describe(help)));
  const pyproject = join(deps.enginePath, 'pyproject.toml');
  session.engineVersion = fs.exists(pyproject)
    ? readEngineVersion(fs.readText(pyproject))
    : null;
  session.scripted.set('Step 1', {
    fact: `engine at ${session.engineCommit}, \`ian --help\` works`,
  });

  // Step 2: the real database, read only and with the inherited environment.
  progress('Step 2: reading the state of your real database (read only)…');
  const status = await run(ian, [...readCommands.databaseStatus], {
    env: deps.env,
  });
  const report = parseJson(status.stdout) as { state?: unknown } | null;
  const state = typeof report?.state === 'string' ? report.state : null;
  session.log.push({
    command: 'ian db status --json',
    output:
      state === null
        ? '(no state in the output)'
        : `state: ${state} (the real database's path is not recorded)`,
  });
  if (state === null)
    throw new SmokeStop('Step 2', stopMessages.databaseUnreadable());
  const expectedExit = state === 'ready' ? 0 : state === 'missing' ? 1 : null;
  if (expectedExit === null || status.code !== expectedExit)
    throw new SmokeStop('Step 2', stopMessages.databaseNotReady(state));
  session.scripted.set('Step 2', { fact: `real database: ${state}` });

  // Step 3: the throwaway database, for every later command.
  const folder = join(repositoryRoot, '.tmp', 'smoke', folderStamp(deps.now));
  session.throwawayFolder = relative(repositoryRoot, folder)
    .split('\\')
    .join('/');
  progress(
    `Step 3: creating the throwaway database folder ${session.throwawayFolder}…`,
  );
  fs.makeFolder(folder);
  session.databaseUrl = databaseUrlFor(folder);
  const childEnv: Environment = {
    ...deps.env,
    IAN_DATABASE_URL: session.databaseUrl,
  };
  session.scripted.set('Step 3', { fact: session.throwawayFolder });

  // Steps 4 to 9: the document's commands, in order.
  const allowsFailureExit = new Set(['Step 7', 'Step 8']);
  let announced = '';
  for (const command of setupCommands) {
    if (command.step !== announced) {
      announced = command.step;
      progress(progressLines[command.step] ?? `${command.step}: running…`);
    }
    const line = `ian ${command.args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(' ')}`;
    const result = await run(ian, command.args, { env: childEnv });
    logRun(line, result);
    const accepted =
      result.code === 0 ||
      (result.code === 1 && allowsFailureExit.has(command.step));
    if (!accepted)
      throw new SmokeStop(
        command.step,
        stopMessages.commandFailed(
          command.step,
          command.args.join(' '),
          describe(result),
        ),
      );
    if (command.args[0] === 'db' && command.args[1] === 'status') {
      const text = `${result.stdout}${result.stderr}`;
      if (!/state:\s*ready/i.test(text) || !text.includes(throwawayFile))
        throw new SmokeStop(
          'Step 4',
          stopMessages.commandFailed(
            'Step 4',
            'db status',
            'did not name the throwaway file and report State: ready',
          ),
        );
    }
    const step = command.step;
    if (command.args[0] === 'refresh') {
      const counts = await run(ian, [...readCommands.refreshes], {
        env: childEnv,
      });
      logRun('ian runs refreshes --json', counts);
      const items = (
        parseJson(counts.stdout) as {
          items?: { outcome_counts?: { completed?: number } }[];
        } | null
      )?.items;
      if (!items?.some((item) => (item.outcome_counts?.completed ?? 0) > 0))
        throw new SmokeStop('Step 7', stopMessages.noCompletedRun());
    }
    const next = setupCommands[setupCommands.indexOf(command) + 1];
    if (next === undefined || next.step !== step)
      session.scripted.set(step, {
        fact:
          step === 'Step 7' && result.code === 1
            ? 'refresh exited 1: some entries did not complete'
            : undefined,
      });
  }

  // Step 9: the counts, from the JSON forms and never from text.
  const readJson = async (args: readonly string[]) => {
    const result = await run(ian, [...args], { env: childEnv });
    logRun(`ian ${args.join(' ')}`, result);
    return parseJson(result.stdout) as {
      items?: Record<string, unknown>[];
      has_more?: boolean;
    } | null;
  };
  const runs = await readJson(readCommands.runs);
  const refreshes = await readJson(readCommands.refreshes);
  const watchlists = await readJson(readCommands.watchlists);
  const runCount = runs?.items?.length ?? -1;
  const refreshCount = refreshes?.items?.length ?? -1;
  const refreshRuns = Number(refreshes?.items?.[0]?.run_count ?? -1);
  const watchlistCount = watchlists?.items?.length ?? -1;
  const entryCount = (watchlists?.items ?? []).reduce(
    (sum, item) => sum + Number(item.entry_count ?? 0),
    0,
  );
  const summary = `${runCount} runs, ${refreshCount} refresh(es) of ${refreshRuns} runs, ${watchlistCount} watchlists with ${entryCount} entries`;
  if (
    runCount !== 5 ||
    runs?.has_more === true ||
    refreshCount !== 1 ||
    refreshRuns !== 4 ||
    watchlistCount !== 2 ||
    entryCount !== 4
  )
    throw new SmokeStop('Step 9', stopMessages.wrongCounts(summary));
  session.data = {
    watchlists: watchlistCount,
    entries: entryCount,
    runs: runCount,
    refreshes: refreshCount,
  };
  session.scripted.set('Step 9', { fact: summary });
}
