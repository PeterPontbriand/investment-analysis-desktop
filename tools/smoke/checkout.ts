// Switching the engine checkout to the vendored commit for the smoke test, and
// putting it back. Only `git switch` is used, never with --force, and never
// `reset`, so a checkout that cannot be switched or restored is left as it is.
import type { Runner } from './types.ts';

// Where the engine checkout was before the switch: on a branch, or detached at
// a commit (a checkout of a commit rather than a branch).
export type StartPoint =
  { kind: 'branch'; name: string } | { kind: 'commit'; commit: string };

export type EngineState = 'switched' | 'restored' | 'not-restored';

export type EngineSwitch = {
  folder: string;
  start: StartPoint;
  state: EngineState;
  // Set while a restore runs, so a second request waits for it.
  restoring: Promise<void> | null;
};

export type Log = (command: string, output: string) => void;

function restoreArguments(start: StartPoint): string[] {
  return start.kind === 'branch'
    ? ['switch', start.name]
    : ['switch', '--detach', start.commit];
}

// The one command that puts the checkout back, for the terminal.
export function restoreCommand(folder: string, start: StartPoint): string {
  return `git -C "${folder}" ${restoreArguments(start).join(' ')}`;
}

// The same command for the record, which is pasted into public pull requests,
// so it names no folder.
export function restoreCommandForRecord(start: StartPoint): string {
  return `git -C <engine checkout> ${restoreArguments(start).join(' ')}`;
}

export function describeStart(start: StartPoint): string {
  return start.kind === 'branch'
    ? `branch \`${start.name}\``
    : `commit \`${start.commit}\``;
}

// Where the checkout is now: a branch name, or the full commit when detached.
export async function readStartPoint(
  run: Runner,
  folder: string,
  commit: string,
  log: Log,
): Promise<StartPoint> {
  const result = await run('git', [
    '-C',
    folder,
    'symbolic-ref',
    '--short',
    '-q',
    'HEAD',
  ]);
  log('git -C <engine> symbolic-ref --short -q HEAD', result.stdout);
  const name = result.stdout.trim();
  return result.code === 0 && name !== ''
    ? { kind: 'branch', name }
    : { kind: 'commit', commit };
}

// True when the checkout has the commit, fetching from origin once when it does
// not.
export async function hasCommit(
  run: Runner,
  folder: string,
  commit: string,
  log: Log,
): Promise<boolean> {
  const check = () =>
    run('git', ['-C', folder, 'cat-file', '-e', `${commit}^{commit}`]);
  const first = await check();
  log('git -C <engine> cat-file -e <commit>^{commit}', `exit ${first.code}`);
  if (first.code === 0) return true;
  const fetched = await run('git', ['-C', folder, 'fetch', 'origin']);
  log('git -C <engine> fetch origin', `${fetched.stdout}${fetched.stderr}`);
  const second = await check();
  log('git -C <engine> cat-file -e <commit>^{commit}', `exit ${second.code}`);
  return second.code === 0;
}

// Switches the checkout to the commit, detached. Returns the git message when
// it cannot.
export async function switchDetached(
  run: Runner,
  folder: string,
  commit: string,
  log: Log,
): Promise<string | null> {
  const result = await run('git', ['-C', folder, 'switch', '--detach', commit]);
  log(
    'git -C <engine> switch --detach <commit>',
    `${result.stdout}${result.stderr}`,
  );
  return result.code === 0
    ? null
    : (`${result.stderr}${result.stdout}`.trim().split(/\r?\n/)[0] ??
        'git did not say why');
}

// Puts the checkout back where it was, once. A failed restore is never forced:
// it says so and prints the one command that does it.
export function restoreEngine(
  run: Runner,
  engine: EngineSwitch | null,
  print: (text: string) => void,
  log: Log,
): Promise<void> {
  if (engine === null || engine.state !== 'switched')
    return engine?.restoring ?? Promise.resolve();
  engine.restoring ??= (async () => {
    print(`Restoring the engine checkout to ${describeStart(engine.start)}…\n`);
    const result = await run('git', [
      '-C',
      engine.folder,
      ...restoreArguments(engine.start),
    ]);
    log(
      `git -C <engine> ${restoreArguments(engine.start).join(' ')}`,
      `${result.stdout}${result.stderr}`,
    );
    if (result.code === 0) {
      engine.state = 'restored';
      print(
        "The engine checkout is restored. The next `ian` command may take a minute to sync the engine's environment.\n",
      );
    } else {
      engine.state = 'not-restored';
      const detail =
        `${result.stderr}${result.stdout}`.trim().split(/\r?\n/)[0] ?? '';
      print(
        `The engine checkout was NOT restored${detail === '' ? '' : ` (${detail})`}. Restore it yourself with:\n${restoreCommand(engine.folder, engine.start)}\n`,
      );
    }
  })();
  return engine.restoring;
}
