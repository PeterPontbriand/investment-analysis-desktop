// The smoke test's whole run: the setup, the application, and putting the engine
// checkout back however the run ends. `smoke.ts` wires it to the real machine;
// tests wire it to fakes.
import { restoreCommand, restoreEngine } from './checkout.ts';
import { throwawayFile } from './commands.ts';
import { checksArgument, parseChecks, type Targeted } from './checks.ts';
import { startAndFinish } from './finish.ts';
import { scrub } from './record.ts';
import {
  applicationEnvironment,
  newSession,
  runSetup,
  stopMessages,
  type Dependencies,
  type Environment,
  type Session,
} from './setup.ts';
import { SmokeStop, type Runner } from './types.ts';

export type StopSignal = 'SIGINT' | 'SIGTERM' | 'SIGHUP';

// What the run needs of the process's signals. Windows sends SIGHUP when the
// console window closes, and allows about 10 seconds before it ends the process.
export type Signals = {
  on(signal: StopSignal, listener: () => void): void;
  off(signal: StopSignal, listener: () => void): void;
};

export type RunDependencies = {
  setup: Dependencies;
  signals: Signals;
  // Starts the application with the given environment and resolves with its
  // exit status.
  startApplication: (env: Environment) => Promise<number>;
  // Writes the record, and returns its path (null before the throwaway folder
  // exists).
  writeRecord: (
    session: Session,
    stopped: { step: string; message: string } | null,
    targeted: Targeted | null,
  ) => Promise<string | null>;
  // The ids of the checks in the smoke test document, for `--checks`.
  checkIds: string[];
  print: (text: string) => void;
  printError: (text: string) => void;
  exit: (code: number) => void;
};

// The targeted run the arguments name, or the one message when they are wrong.
// `pnpm smoke` takes one option, `--checks`; it asks `ian` where the engine is.
export function checkArguments(
  args: string[],
  checkIds: string[],
): { targeted: Targeted | null } | { message: string } {
  if (args.some((arg) => arg === '--engine' || arg.startsWith('--engine=')))
    return { message: stopMessages.engineArgument() };
  if (args.length === 0) return { targeted: null };
  const list = checksArgument(args);
  if (list === undefined) return { message: stopMessages.noArguments() };
  const result = parseChecks(list, checkIds);
  return result.ok
    ? { targeted: result.targeted }
    : { message: result.message };
}

const signalNumbers: Record<StopSignal, number> = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGTERM: 15,
};

// Thrown by the setup's commands once a stop signal has arrived: no further
// command starts.
class Interrupted extends Error {}

export async function runSmoke(
  deps: RunDependencies,
  args: string[],
): Promise<number> {
  const { print, printError } = deps;
  const parsed = checkArguments(args, deps.checkIds);
  if ('message' in parsed) {
    printError(`${parsed.message}\n`);
    return 1;
  }
  const targeted = parsed.targeted;
  const session = newSession();
  // 'setup' until the application starts, then 'application', then 'ending'.
  let phase: 'setup' | 'application' | 'ending' = 'setup';
  let interrupted: StopSignal | null = null;
  let interruption: Promise<void> | null = null;
  let setupSettled: Promise<unknown> = Promise.resolve();
  const abort = new AbortController();
  // True once the record is handed over (the pre-application write). From then
  // on the tool never writes the record, for any reason, because an editor may
  // hold the contributor's unsaved marks.
  let handedOver = false;
  // Every record write goes through this queue, so writes happen one at a
  // time in the order they were asked for. A normal write is skipped once a
  // stop signal has arrived, so the last write of an interrupted run is the
  // interruption's own.
  let writes: Promise<unknown> = Promise.resolve();
  const writeRecord = (
    stopped: { step: string; message: string } | null,
    interruption = false,
  ): Promise<string | null> => {
    const next = writes.then(() =>
      !interruption && interrupted !== null
        ? null
        : deps.writeRecord(session, stopped, targeted),
    );
    writes = next.catch(() => null);
    return next;
  };
  const restore = () =>
    restoreEngine(
      deps.setup.run,
      session.engineSwitch,
      print,
      (command, output) =>
        session.log.push({
          command,
          output: scrub(
            output,
            deps.setup.repositoryRoot,
            session.engineFolder,
          ),
        }),
    );
  // The setup's commands end with the stop signal and start no more after it.
  const guard =
    (run: Runner, abortable: boolean): Runner =>
    (file, commandArgs, options) =>
      abort.signal.aborted
        ? Promise.reject(new Interrupted())
        : run(file, commandArgs, {
            ...options,
            ...(abortable ? { signal: abort.signal } : {}),
          });
  const setup: Dependencies = {
    ...deps.setup,
    run: guard(deps.setup.run, true),
    runToCompletion: guard(deps.setup.runToCompletion, false),
  };

  // Setup stops, thrown errors, application exits and signals all restore.
  const handlers = new Map<StopSignal, () => void>();
  for (const signal of Object.keys(signalNumbers) as StopSignal[]) {
    const handler = () => {
      // Ctrl+C reaches the application too, which then exits on its own.
      if (signal === 'SIGINT' && phase === 'application') return;
      if (interrupted !== null) return;
      interrupted = signal;
      printError(`\nStopped by ${signal}.\n`);
      // One path: end the running command, let setup finish (it starts no
      // more), then restore and exit. Before the handover the record is
      // written once with the stop; after it the stop and the restore's
      // result are shown in the terminal only.
      abort.abort();
      interruption = (async () => {
        await setupSettled;
        await restore();
        if (!handedOver)
          await writeRecord(
            {
              step: 'Interrupted',
              message: `The run was stopped by ${signal}.`,
            },
            true,
          ).catch(() => null);
        deps.exit(128 + signalNumbers[signal]);
      })();
    };
    handlers.set(signal, handler);
    deps.signals.on(signal, handler);
  }

  try {
    let failure: unknown = null;
    setupSettled = runSetup(setup, session).then(
      () => undefined,
      (error: unknown) => {
        failure = error;
      },
    );
    await setupSettled;
    const stopped = (): StopSignal | null => interrupted;
    const interruptedBy = stopped();
    if (interruptedBy !== null) {
      await interruption;
      return 128 + signalNumbers[interruptedBy];
    }
    if (failure !== null) {
      if (!(failure instanceof SmokeStop)) throw failure;
      printError(`Smoke test stopped at ${failure.step}: ${failure.message}\n`);
      await restore();
      const path = await writeRecord({
        step: failure.step,
        message: failure.message,
      });
      if (path) printError(`The record so far is in ${path}\n`);
      return 1;
    }
    session.scripted.set('Step 10', {
      fact: 'the tool started the application; mark whether its window opened',
      leftToYou: true,
    });
    const path = await writeRecord(null);
    // A signal before or during that write leaves the application unstarted.
    const lateSignal = stopped();
    if (lateSignal !== null) {
      await interruption;
      return 128 + signalNumbers[lateSignal];
    }
    // The handover: the record is the contributor's from here on.
    handedOver = true;
    const folder = session.throwawayFolder ?? '';
    const engine = session.engineSwitch;
    print(
      `The record is ${path}\nClean-up will delete these files in ${folder}, and leave the folder and the record: ${throwawayFile}, ${throwawayFile}-wal, ${throwawayFile}-shm\n${
        engine === null
          ? ''
          : `The engine checkout is switched; it is restored when the application exits. If this terminal closes first, restore it with: ${restoreCommand(engine.folder, engine.start)}\n`
      }Starting the application…\n`,
    );
    phase = 'application';
    let code: number;
    try {
      code = await startAndFinish({
        start: () =>
          deps.startApplication(applicationEnvironment(setup.env, session)),
        print,
      });
    } finally {
      phase = 'ending';
    }
    // The restore's result is shown in the terminal only.
    await restore();
    if (interruption !== null) await interruption;
    return code;
  } finally {
    for (const [signal, handler] of handlers) deps.signals.off(signal, handler);
    await restore();
  }
}
