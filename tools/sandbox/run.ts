// The sandbox's whole run: the setup, the application, and putting the engine
// checkout back however the run ends. `sandbox.ts` wires it to the real
// machine; tests wire it to fakes.
import { restoreCommand, restoreEngine } from './checkout.ts';
import { throwawayFile } from './commands.ts';
import {
  applicationEnvironment,
  newSession,
  runSetup,
  type Dependencies,
  type Environment,
} from './setup.ts';
import { SandboxStop } from './stop.ts';
import type { Runner } from '../engine/types.ts';

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
  print: (text: string) => void;
  printError: (text: string) => void;
  exit: (code: number) => void;
};

const signalNumbers: Record<StopSignal, number> = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGTERM: 15,
};

// Thrown by the setup's commands once a stop signal has arrived: no further
// command starts.
class Interrupted extends Error {}

export async function runSandbox(
  deps: RunDependencies,
  args: string[],
): Promise<number> {
  const { print, printError } = deps;
  if (args.length > 0) {
    printError('`pnpm sandbox` takes no options.\n');
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
      (command, output) => session.log.push({ command, output }),
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
      // more), then restore and exit.
      abort.abort();
      interruption = (async () => {
        await setupSettled;
        await restore();
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
    const interruptedBy: StopSignal | null = interrupted;
    if (interruptedBy !== null) {
      await interruption;
      return 128 + signalNumbers[interruptedBy];
    }
    if (failure !== null) {
      if (!(failure instanceof SandboxStop)) throw failure;
      printError(`Sandbox stopped at ${failure.step}: ${failure.message}\n`);
      // The last command's output is what says why it failed.
      const last = session.log.at(-1);
      if (last !== undefined && last.output.trim() !== '')
        printError(`${last.command}:\n${last.output.trim()}\n`);
      await restore();
      return 1;
    }
    const folder = session.throwawayFolder ?? '';
    const engine = session.engineSwitch;
    print(
      `The sandbox's database is in ${folder}. Clean-up can delete ${throwawayFile}, ${throwawayFile}-wal and ${throwawayFile}-shm there.\n${
        engine === null
          ? ''
          : `The engine checkout is switched; it is restored when the application exits. If this terminal closes first, restore it with: ${restoreCommand(engine.folder, engine.start)}\n`
      }Starting the application…\n`,
    );
    phase = 'application';
    let code: number;
    try {
      code = await deps.startApplication(
        applicationEnvironment(setup.env, session),
      );
    } finally {
      phase = 'ending';
    }
    if (code !== 0) print(`The application exited with status ${code}.\n`);
    await restore();
    if (interruption !== null) await interruption;
    return code;
  } finally {
    for (const [signal, handler] of handlers) deps.signals.off(signal, handler);
    await restore();
  }
}
