// The smoke test's whole run: the setup, the application, and putting the engine
// checkout back however the run ends. `smoke.ts` wires it to the real machine;
// tests wire it to fakes.
import { restoreCommand, restoreEngine } from './checkout.ts';
import { throwawayFile } from './commands.ts';
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
  ) => Promise<string | null>;
  print: (text: string) => void;
  printError: (text: string) => void;
  exit: (code: number) => void;
};

// The one message when the arguments are wrong, or null. `pnpm smoke` takes
// none: it asks `ian` where the engine is.
export function checkArguments(args: string[]): string | null {
  if (args.some((arg) => arg === '--engine' || arg.startsWith('--engine=')))
    return stopMessages.engineArgument();
  return args.length > 0 ? stopMessages.noArguments() : null;
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
  const message = checkArguments(args);
  if (message !== null) {
    printError(`${message}
`);
    return 1;
  }
  const session = newSession();
  // 'setup' until the application starts, then 'application', then 'ending'.
  let phase: 'setup' | 'application' | 'ending' = 'setup';
  let interrupted: StopSignal | null = null;
  let interruption: Promise<void> | null = null;
  let setupSettled: Promise<unknown> = Promise.resolve();
  const abort = new AbortController();
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
      printError(`
Stopped by ${signal}.
`);
      // One path: end the running command, let setup finish (it starts no
      // more), then restore, write the record once and exit.
      abort.abort();
      interruption = (async () => {
        await setupSettled;
        await restore();
        await deps
          .writeRecord(session, {
            step: 'Interrupted',
            message: `The run was stopped by ${signal}.`,
          })
          .catch(() => null);
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
      printError(`Smoke test stopped at ${failure.step}: ${failure.message}
`);
      await restore();
      const path = await deps.writeRecord(session, {
        step: failure.step,
        message: failure.message,
      });
      if (path)
        printError(`The record so far is in ${path}
`);
      return 1;
    }
    session.scripted.set('Step 10', {
      fact: 'the tool started the application; mark whether its window opened',
      leftToYou: true,
    });
    const path = await deps.writeRecord(session, null);
    const folder = session.throwawayFolder ?? '';
    const engine = session.engineSwitch;
    print(
      `The record is ${path}\nClean-up will delete these files in ${folder}, and leave the folder and the record: ${throwawayFile}, ${throwawayFile}-wal, ${throwawayFile}-shm\n${
        engine === null
          ? ''
          : `The engine checkout is switched; it is restored when the application exits. If this terminal closes first, restore it with: ${restoreCommand(engine.folder, engine.start)}\n`
      }Starting the application…\n`,
    );
    // A signal during the lines above leaves the application unstarted.
    const lateSignal = stopped();
    if (lateSignal !== null) {
      await interruption;
      return 128 + signalNumbers[lateSignal];
    }
    phase = 'application';
    let code: number;
    try {
      code = await startAndFinish({
        session,
        start: () =>
          deps.startApplication(applicationEnvironment(setup.env, session)),
        rewrite: () => deps.writeRecord(session, null),
        print,
      });
    } finally {
      phase = 'ending';
    }
    await restore();
    // The record's engine line now says whether the checkout was restored.
    if (session.engineSwitch !== null) await deps.writeRecord(session, null);
    return code;
  } finally {
    for (const [signal, handler] of handlers) deps.signals.off(signal, handler);
    await restore();
  }
}
