// The sandbox's setup: finds the engine, makes a throwaway database with sample
// data, and stops with a plain message instead of guessing.
import { join, relative } from 'node:path';
import {
  hasCommit,
  readStartPoint,
  restoreCommand,
  switchDetached,
  type EngineSwitch,
  type StartPoint,
} from './checkout.ts';
import { readCommands, setupCommands, throwawayFile } from './commands.ts';
import { SandboxStop } from './stop.ts';
import {
  EngineProblem,
  engineMessages,
  locateEngine,
  readAbout,
} from '../engine/engine.ts';
import { readVendoredCommit, type IanSource } from '../engine/source.ts';
import {
  type FileSystem,
  type RunResult,
  type Runner,
} from '../engine/types.ts';

export type Environment = Record<string, string | undefined>;

export type Dependencies = {
  run: Runner;
  // Like `run`, but a command already started is left to finish when setup is
  // told to stop. The switch uses it, so Git is never killed half-way.
  runToCompletion: Runner;
  fs: FileSystem;
  env: Environment;
  platform: string;
  repositoryRoot: string;
  // The moment the throwaway folder is named after, in local time.
  now: Date;
  // Prints one progress line to standard output.
  progress: (line: string) => void;
};

// What the setup learned and did so far, kept even when a step stops it, so the
// record can show everything up to that point.
export type Session = {
  log: { command: string; output: string }[];
  engineCommit: string | null;
  ianPath: string | null;
  // Where `ian` was found.
  ianSource: IanSource | null;
  // The engine checkout's folder, kept for the restore and never recorded.
  engineFolder: string | null;
  // Set once the checkout needs a switch (and after it is done).
  engineSwitch: EngineSwitch | null;
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
    log: [],
    engineCommit: null,
    ianPath: null,
    ianSource: null,
    engineFolder: null,
    engineSwitch: null,
    throwawayFolder: null,
    databaseUrl: null,
    data: null,
  };
}

// The label of a stop after the switch, which happens after the throwaway folder is made.
export const switchStep = 'Engine switch';

// The stop messages.
export const stopMessages = {
  ...engineMessages,
  uncommittedChanges: (found: string, wanted: string, known: boolean) =>
    `The engine checkout is at ${found}, not the vendored commit ${wanted}, and ${known ? 'it has uncommitted changes' : 'Git could not say whether it has uncommitted changes'}, so the tool will not switch it. Commit, stash or discard the changes in the engine checkout, then try again.`,
  commitMissing: (wanted: string) =>
    `The engine checkout does not have the vendored commit ${wanted}, even after fetching from its origin. Nothing was switched. Check that the commit is on the engine's origin, then try again.`,
  switchFailed: (detail: string) =>
    `Switching the engine checkout to the vendored commit failed (${detail}). The checkout was not changed.`,
  switchedToWrongCommit: (found: string, wanted: string) =>
    `After the switch, \`ian about\` reports commit ${found}, not the vendored commit ${wanted}, so the \`ian\` command does not run the checkout that was switched. The tool restores the checkout and stops.`,
  commandFailed: (step: string, command: string, detail: string) =>
    `${step} failed: \`ian ${command}\` ${detail}.`,
  noCompletedRun: () =>
    "The refresh completed no run, so the screens would have nothing to show. Check the providers with `ian health` and the engine's troubleshooting guide, then try again.",
  wrongCounts: (found: string) =>
    `The setup should leave 6 runs, 1 refresh of 5 runs and 3 watchlists with 11 entries in all, but found ${found}. Use a new throwaway database: run pnpm sandbox again.`,
} as const;

// One line when each stage of the sample data starts. Stages that call the data providers say so.
const progressLines: Record<string, string> = {
  Database: "Database: creating the throwaway database's schema…",
  Watchlists:
    'Watchlists: creating the Sandbox, Sandbox Empty and Sandbox Scratch watchlists…',
  Entries:
    'Entries: adding five entries to the Sandbox watchlist and six to Sandbox Scratch…',
  Refresh:
    'Refresh: refreshing the Sandbox watchlist (this calls the data providers and can take a few minutes)…',
  Analysis:
    'Analysis: saving one direct analysis of MSFT (this calls the data providers and can take a minute)…',
  Counts:
    'Counts: reading back the saved runs, refreshes and watchlists to check their counts…',
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

// The database URL of a throwaway folder.
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
      output: `${result.stdout}${result.stderr}`,
    });

  // Find the engine through `ian about`, and decide whether its checkout must
  // be switched to the vendored commit.
  progress('Engine: finding the engine through `ian` and checking its commit…');
  const wanted = readVendoredCommit(
    fs.readText(join(repositoryRoot, 'vendor', 'ian', 'SOURCE.md')),
  );
  const logAbout = (command: string, output: string) =>
    session.log.push({ command, output });
  const logEngine = (command: string, output: string) =>
    session.log.push({
      command,
      output,
    });
  const engineStopAt =
    (step: string) =>
    (error: unknown): never => {
      if (error instanceof EngineProblem)
        throw new SandboxStop(step, error.message);
      throw error;
    };
  const engineStop = engineStopAt('Engine');
  const located = await locateEngine(deps, logAbout).catch(engineStop);
  const ian = located.ian.path;
  const engineFolder = located.about.installationFolder;
  session.ianPath = ian;
  session.ianSource = located.ian.source;
  session.engineFolder = engineFolder;
  const short = wanted.slice(0, 7);
  let plannedStart: StartPoint | null = null;
  if (located.about.commit !== wanted) {
    // A switch is needed: refuse a checkout with changes (or whose changes Git
    // could not report), then make sure the commit is there before any switch.
    if (located.about.uncommittedChanges !== false)
      throw new SandboxStop(
        'Engine',
        stopMessages.uncommittedChanges(
          located.about.commit.slice(0, 7),
          wanted.slice(0, 7),
          located.about.uncommittedChanges === true,
        ),
      );
    if (!(await hasCommit(run, engineFolder, wanted, logEngine)))
      throw new SandboxStop('Engine', stopMessages.commitMissing(wanted));
    plannedStart = await readStartPoint(
      run,
      engineFolder,
      located.about.commit,
      logEngine,
    );
  }
  if (plannedStart === null) session.engineCommit = short;
  // The throwaway database, for every later command.
  const folder = join(repositoryRoot, '.tmp', 'sandbox', folderStamp(deps.now));
  session.throwawayFolder = relative(repositoryRoot, folder)
    .split('\\')
    .join('/');
  progress(
    `Folder: creating the throwaway database folder ${session.throwawayFolder}…`,
  );
  fs.makeFolder(folder);
  session.databaseUrl = databaseUrlFor(folder);
  const childEnv: Environment = {
    ...deps.env,
    IAN_DATABASE_URL: session.databaseUrl,
  };

  // The switch, now that the real database has been read and the throwaway
  // database is set for every later command.
  if (plannedStart !== null) {
    const engine: EngineSwitch = {
      folder: engineFolder,
      start: plannedStart,
      state: 'switched',
      restoring: null,
    };
    progress(
      `Switching the engine checkout to the vendored commit ${short}. If this terminal closes before the test ends, restore it with: ${restoreCommand(engineFolder, plannedStart)}`,
    );
    session.engineSwitch = engine;
    const failure = await switchDetached(
      deps.runToCompletion,
      engineFolder,
      wanted,
      logEngine,
    );
    if (failure !== null) {
      session.engineSwitch = null;
      throw new SandboxStop(switchStep, stopMessages.switchFailed(failure));
    }
    progress(
      "The engine's environment may take a minute to sync after the switch…",
    );
    const after = await readAbout(run, ian, childEnv, logAbout).catch(
      engineStopAt(switchStep),
    );
    if (after.commit !== wanted)
      throw new SandboxStop(
        switchStep,
        stopMessages.switchedToWrongCommit(
          after.commit.slice(0, 7),
          wanted.slice(0, 7),
        ),
      );
    session.engineCommit = short;
  }

  // The sample data's commands, in order.
  const allowsFailureExit = new Set(['Refresh', 'Analysis']);
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
      throw new SandboxStop(
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
        throw new SandboxStop(
          'Database',
          stopMessages.commandFailed(
            'Database',
            'db status',
            'did not name the throwaway file and report State: ready',
          ),
        );
    }
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
        throw new SandboxStop('Refresh', stopMessages.noCompletedRun());
    }
  }

  // The counts, from the JSON forms and never from text.
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
    runCount !== 6 ||
    runs?.has_more === true ||
    refreshCount !== 1 ||
    refreshRuns !== 5 ||
    watchlistCount !== 3 ||
    entryCount !== 11
  )
    throw new SandboxStop('Counts', stopMessages.wrongCounts(summary));
  session.data = {
    watchlists: watchlistCount,
    entries: entryCount,
    runs: runCount,
    refreshes: refreshCount,
  };
  progress(`Sample data: ${summary}.`);
}

// The environment of the application started: the throwaway
// database, and IAD_IAN_PATH only when `ian` came from uv's command folder, so
// the application finds the same file. The tool's own environment is unchanged.
export function applicationEnvironment(
  env: Environment,
  session: Session,
): Environment {
  return {
    ...env,
    IAN_DATABASE_URL: session.databaseUrl ?? undefined,
    ...(session.ianSource === 'uv' && session.ianPath !== null
      ? { IAD_IAN_PATH: session.ianPath }
      : {}),
  };
}
