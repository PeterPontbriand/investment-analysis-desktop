import { describe, expect, it } from 'vitest';
import {
  EngineProblem,
  engineMessages,
  parseAbout,
} from '../../tools/engine/engine.ts';
import {
  runSandbox,
  type RunDependencies,
  type StopSignal,
} from '../../tools/sandbox/run.ts';
import {
  newSession,
  runSetup,
  stopMessages,
  type Session,
} from '../../tools/sandbox/setup.ts';
import { SandboxStop } from '../../tools/sandbox/stop.ts';
import {
  aboutJson,
  dependencies,
  enginePath,
  healthy,
  vendoredCommit,
  type Call,
  type Script,
} from './sandbox-fixtures.ts';

const other = 'a'.repeat(40);
const fail = (stderr = 'no') => ({ code: 1, stdout: '', stderr });
const succeed = (stdout = '') => ({ code: 0, stdout, stderr: '' });

type EngineOptions = {
  commit?: string;
  dirty?: boolean | null;
  // null: the checkout is detached.
  branch?: string | null;
  hasCommit?: boolean;
  hasCommitAfterFetch?: boolean;
  switchCode?: number;
  restoreCode?: number;
};

// A fake engine checkout that moves when it is switched. The `ian about`
// answers follow it.
function engine(options: EngineOptions = {}) {
  const state = {
    commit: options.commit ?? other,
    fetched: false,
    restored: 0,
  };
  const dirty = options.dirty === undefined ? false : options.dirty;
  const script: Script = (call) => {
    if (call.file === 'git' && call.args[0] === '-C') {
      const line = call.args.slice(2).join(' ');
      if (line === 'symbolic-ref --short -q HEAD')
        return options.branch === null
          ? fail()
          : succeed(`${options.branch ?? 'main'}\n`);
      if (line.startsWith('cat-file -e'))
        return (options.hasCommit ?? true) ||
          (state.fetched && options.hasCommitAfterFetch === true)
          ? succeed()
          : fail();
      if (line === 'fetch origin') {
        state.fetched = true;
        return succeed();
      }
      if (line === `switch --detach ${vendoredCommit}`) {
        if ((options.switchCode ?? 0) !== 0) return fail('fatal: cannot');
        state.commit = vendoredCommit;
        return succeed();
      }
      if (line.startsWith('switch ')) {
        state.restored += 1;
        if ((options.restoreCode ?? 0) !== 0)
          return fail('error: local changes would be overwritten');
        state.commit = other;
        return succeed();
      }
    }
    if (call.args.join(' ') === 'about --json')
      return aboutJson({ commit: state.commit, uncommitted_changes: dirty });
    return undefined;
  };
  return { script, state };
}

const gitCalls = (calls: Call[]) =>
  calls
    .filter((call) => call.file === 'git')
    .map((call) => call.args.slice(2).join(' '));

function neverForced(calls: Call[]) {
  for (const call of calls) {
    expect(call.args).not.toContain('--force');
    expect(call.args).not.toContain('-f');
    expect(call.args).not.toContain('reset');
  }
}

async function stopOf(session: Session, script: Script) {
  const { deps, calls } = dependencies(healthy(script));
  const error = await runSetup(deps, session).then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(SandboxStop);
  return { error: error as SandboxStop, calls };
}

describe('finding the engine through ian about', () => {
  it('reads the document, whose null fields become empty', () => {
    expect(
      parseAbout(
        JSON.stringify({
          engine_version: '1.2.3',
          installation_folder: null,
          commit: null,
          uncommitted_changes: null,
        }),
      ),
    ).toEqual({
      engineVersion: '1.2.3',
      installationFolder: '',
      commit: '',
      uncommittedChanges: null,
    });
    expect(parseAbout('not json')).toBeNull();
    expect(parseAbout('{"commit":"x"}')).toBeNull();
  });

  it('stops when the engine does not know ian about', async () => {
    const { error } = await stopOf(newSession(), (call) =>
      call.args.join(' ') === 'about --json'
        ? { code: 2, stdout: '', stderr: "No such command 'about'." }
        : undefined,
    );
    expect(error.step).toBe('Engine');
    expect(error.message).toBe(engineMessages.aboutUnknown());
    expect(error.message).toBe(
      'This engine does not know `ian about`, so it is older than the vendored commit. Update it by pulling main in your engine checkout, then try again.',
    );
    expect(error.message).not.toContain('API.');
  });

  it('stops when the engine is installed as a package', async () => {
    const { error, calls } = await stopOf(newSession(), (call) =>
      call.args.join(' ') === 'about --json'
        ? aboutJson({
            installation_folder: null,
            commit: null,
            uncommitted_changes: null,
          })
        : undefined,
    );
    expect(error.message).toBe(engineMessages.installedAsPackage());
    expect(error.message).toMatch(/installed as a package.*source checkout/);
    expect(calls.some((call) => call.file === 'git')).toBe(false);
  });

  it('stops when the installation folder is not a Git checkout', async () => {
    const { error, calls } = await stopOf(newSession(), (call) =>
      call.args.join(' ') === 'about --json'
        ? aboutJson({ commit: null, uncommitted_changes: null })
        : undefined,
    );
    expect(error.message).toBe(engineMessages.notCheckout());
    expect(error.message).toMatch(/not a Git checkout/);
    expect(calls.some((call) => call.file === 'git')).toBe(false);
  });

  it('stops when ian about fails or answers something else', async () => {
    for (const answer of [
      { code: 1, stdout: '', stderr: 'boom' },
      { code: 0, stdout: 'Investment Analysis Engine 0.1.0', stderr: '' },
      { code: null, stdout: '', stderr: 'spawn ian ENOENT' },
    ]) {
      const { error } = await stopOf(newSession(), (call) =>
        call.args.join(' ') === 'about --json' ? answer : undefined,
      );
      expect(error.message).toMatch(/^`ian about --json` did not succeed/);
    }
  });

  it('logs what ian about said without the installation folder', async () => {
    const { deps } = dependencies(healthy());
    const session = newSession();
    await runSetup(deps, session);
    const text = JSON.stringify(session.log);
    expect(text).toContain('ian about --json');
    expect(text).toContain('commit: ' + vendoredCommit);
    expect(text).not.toContain(enginePath.replaceAll('\\', '\\\\'));
    expect(session.engineFolder).toBe(enginePath);
  });

  it('is an EngineProblem the callers turn into their own stop', () => {
    expect(new EngineProblem('x')).toBeInstanceOf(Error);
  });
});

describe('switching the engine checkout', () => {
  it('switches a clean checkout to the vendored commit, detached', async () => {
    const fake = engine({ branch: 'main' });
    const { deps, calls, progress } = dependencies(healthy(fake.script));
    const session = newSession();

    await runSetup(deps, session);

    expect(gitCalls(calls)).toEqual([
      `cat-file -e ${vendoredCommit}^{commit}`,
      'symbolic-ref --short -q HEAD',
      `switch --detach ${vendoredCommit}`,
    ]);
    expect(session.engineSwitch).toMatchObject({
      folder: enginePath,
      start: { kind: 'branch', name: 'main' },
      state: 'switched',
    });
    expect(session.engineCommit).toBe(vendoredCommit.slice(0, 7));
    // Every command after the switch uses the throwaway database.
    const switchAt = calls.findIndex((call) => call.args.includes('switch'));
    for (const call of calls
      .slice(switchAt + 1)
      .filter((c) => c.file !== 'git'))
      expect(call.options?.env?.IAN_DATABASE_URL).toBe(session.databaseUrl);
    for (const call of calls.slice(0, switchAt))
      expect(call.options?.env?.IAN_DATABASE_URL).toBeUndefined();
    // The start-up line carries the restore command, and the sync line follows.
    const restoreLine = progress.findIndex((line) =>
      line.includes(`git -C "${enginePath}" switch main`),
    );
    expect(restoreLine).toBeGreaterThan(-1);
    expect(progress[restoreLine + 1]).toBe(
      "The engine's environment may take a minute to sync after the switch…",
    );
    neverForced(calls);
  });

  it('remembers the full commit when the checkout is detached', async () => {
    const fake = engine({ branch: null });
    const { deps, progress } = dependencies(healthy(fake.script));
    const session = newSession();
    await runSetup(deps, session);
    expect(session.engineSwitch?.start).toEqual({
      kind: 'commit',
      commit: other,
    });
    expect(
      progress.some((line) =>
        line.includes(`git -C "${enginePath}" switch --detach ${other}`),
      ),
    ).toBe(true);
  });

  it('does not switch a checkout already at the vendored commit', async () => {
    const { deps, calls, progress } = dependencies(healthy());
    const session = newSession();
    await runSetup(deps, session);
    expect(calls.some((call) => call.file === 'git')).toBe(false);
    expect(session.engineSwitch).toBeNull();
    expect(progress.some((line) => line.includes('Switching'))).toBe(false);
  });

  it('continues at the vendored commit with uncommitted changes', async () => {
    const { deps, calls } = dependencies(
      healthy((call) =>
        call.args.join(' ') === 'about --json'
          ? aboutJson({ uncommitted_changes: true })
          : undefined,
      ),
    );
    const session = newSession();
    await runSetup(deps, session);
    expect(calls.some((call) => call.file === 'git')).toBe(false);
  });

  it('fetches from origin only when the commit is missing', async () => {
    const fake = engine({ hasCommit: false, hasCommitAfterFetch: true });
    const { deps, calls } = dependencies(healthy(fake.script));
    const session = newSession();
    await runSetup(deps, session);
    expect(gitCalls(calls)).toEqual([
      `cat-file -e ${vendoredCommit}^{commit}`,
      'fetch origin',
      `cat-file -e ${vendoredCommit}^{commit}`,
      'symbolic-ref --short -q HEAD',
      `switch --detach ${vendoredCommit}`,
    ]);
    expect(session.engineSwitch?.state).toBe('switched');
  });

  it('stops before anything is switched when the commit is missing after the fetch', async () => {
    const fake = engine({ hasCommit: false });
    const session = newSession();
    const { error, calls } = await stopOf(session, fake.script);
    expect(error.step).toBe('Engine');
    expect(error.message).toBe(stopMessages.commitMissing(vendoredCommit));
    expect(gitCalls(calls)).toContain('fetch origin');
    expect(calls.some((call) => call.args.includes('switch'))).toBe(false);
    expect(session.engineSwitch).toBeNull();
    // Nothing after the engine stage ran.
    expect(session.throwawayFolder).toBeNull();
  });

  it.each([
    ['has uncommitted changes', true, /it has uncommitted changes/],
    ['has a status Git could not read', null, /could not say whether/],
  ])('refuses to switch a checkout that %s', async (_name, dirty, message) => {
    const fake = engine({ dirty });
    const session = newSession();
    const { error, calls } = await stopOf(session, fake.script);
    expect(error.step).toBe('Engine');
    expect(error.message).toMatch(message);
    expect(error.message).toMatch(/will not switch it/);
    expect(calls.some((call) => call.file === 'git')).toBe(false);
    expect(session.engineSwitch).toBeNull();
  });

  it('stops, with nothing to restore, when the switch itself fails', async () => {
    const fake = engine({ switchCode: 1 });
    const session = newSession();
    const { error } = await stopOf(session, fake.script);
    expect(error.step).toBe('Engine switch');
    expect(error.message).toBe(stopMessages.switchFailed('fatal: cannot'));
    expect(session.engineSwitch).toBeNull();
  });

  it('stops when ian does not run the checkout that was switched', async () => {
    const fake = engine();
    const session = newSession();
    const { error } = await stopOf(session, (call) => {
      const answer = fake.script(call);
      return call.args.join(' ') === 'about --json' &&
        fake.state.commit === vendoredCommit
        ? aboutJson({ commit: other })
        : answer;
    });
    expect(error.step).toBe('Engine switch');
    expect(error.message).toBe(
      stopMessages.switchedToWrongCommit('aaaaaaa', vendoredCommit.slice(0, 7)),
    );
    // The switch happened, so the run still has the checkout to restore.
    expect(session.engineSwitch?.state).toBe('switched');
  });
});

// A fake machine for the whole run: signals the test can send and an
// application the test controls.
function machine(script: Script, options: { exitCode?: number } = {}) {
  const made = dependencies(healthy(script));
  const listeners = new Map<StopSignal, (() => void)[]>();
  const signals = {
    on: (signal: StopSignal, listener: () => void) =>
      listeners.set(signal, [...(listeners.get(signal) ?? []), listener]),
    off: (signal: StopSignal, listener: () => void) =>
      listeners.set(
        signal,
        (listeners.get(signal) ?? []).filter((entry) => entry !== listener),
      ),
    emit: (signal: StopSignal) => {
      for (const listener of listeners.get(signal) ?? []) listener();
    },
    count: () => [...listeners.values()].reduce((n, l) => n + l.length, 0),
  };
  const out: string[] = [];
  const err: string[] = [];
  const exits: number[] = [];
  let application: ((code: number) => void) | null = null;
  let started = false;
  const deps: RunDependencies = {
    setup: made.deps,
    signals,
    startApplication: (env) => {
      started = true;
      expect(env.IAN_DATABASE_URL).toMatch(/sandbox\.sqlite3$/);
      if (options.exitCode !== undefined)
        return Promise.resolve(options.exitCode);
      return new Promise<number>((resolve) => {
        application = resolve;
      });
    },
    print: (text) => out.push(text),
    printError: (text) => err.push(text),
    exit: (code) => exits.push(code),
  };
  return {
    deps,
    calls: made.calls,
    signals,
    out,
    err,
    exits,
    started: () => started,
    endApplication: (code: number) => application?.(code),
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const restoreCalls = (calls: Call[]) =>
  gitCalls(calls).filter(
    (line) => line === 'switch main' || line === `switch --detach ${other}`,
  );

describe('restoring the engine checkout', () => {
  it('restores when setup stops, and says where it stopped', async () => {
    const fake = engine();
    const run = machine((call) =>
      call.args.join(' ') === 'db upgrade'
        ? { code: 3, stdout: '', stderr: '' }
        : fake.script(call),
    );
    const code = await runSandbox(run.deps, []);
    expect(code).toBe(1);
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
    expect(fake.state.commit).toBe(other);
    expect(run.err.join('')).toContain('Sandbox stopped at Database');
    expect(run.started()).toBe(false);
    expect(run.signals.count()).toBe(0);
    neverForced(run.calls);
  });

  it.each([0, 1, 137])(
    'restores when the application exits with status %i',
    async (exitCode) => {
      const fake = engine();
      const run = machine(fake.script, { exitCode });
      const code = await runSandbox(run.deps, []);
      expect(code).toBe(exitCode);
      expect(restoreCalls(run.calls)).toEqual(['switch main']);
      expect(run.out.join('')).toContain('The engine checkout is restored');
      expect(run.out.join('')).toContain(
        `restore it with: git -C "${enginePath}" switch main`,
      );
      expect(run.out.join('').includes('The application exited with')).toBe(
        exitCode !== 0,
      );
      expect(run.signals.count()).toBe(0);
    },
  );

  it('restores when something throws, and leaves the error', async () => {
    const fake = engine();
    const run = machine(fake.script);
    run.deps.startApplication = () => Promise.reject(new Error('spawn failed'));
    await expect(runSandbox(run.deps, [])).rejects.toThrow('spawn failed');
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
    expect(run.signals.count()).toBe(0);
  });

  it('restores a detached checkout with git switch --detach', async () => {
    const fake = engine({ branch: null });
    const run = machine(fake.script, { exitCode: 0 });
    await runSandbox(run.deps, []);
    expect(restoreCalls(run.calls)).toEqual([`switch --detach ${other}`]);
  });

  const signals = [
    ['SIGTERM', 143],
    ['SIGHUP', 129],
    ['SIGINT', 130],
  ] as const;

  // Sends the signal while the command matching `during` runs, and checks that
  // setup ends there.
  async function interruptDuring(
    during: (call: Call) => boolean,
    signal: StopSignal,
    options: EngineOptions = {},
    answer?: (call: Call) => ReturnType<Script>,
    // The switch is left to finish rather than killed half-way.
    killed = true,
  ) {
    const fake = engine(options);
    let triggered: Call | null = null;
    const run = machine((call) => {
      if (triggered === null && during(call)) {
        triggered = call;
        run.signals.emit(signal);
        return answer?.(call) ?? fake.script(call);
      }
      return fake.script(call);
    });
    const code = await runSandbox(run.deps, []);
    await flush();
    const at = run.calls.findIndex((call) => call === triggered);
    expect(at).toBeGreaterThan(-1);
    // The command that was running was told to stop.
    expect(triggered!.options?.signal?.aborted).toBe(killed ? true : undefined);
    // Nothing ran after the signal but the restore.
    const after = run.calls.slice(at + 1);
    expect(after.every((call) => call.file === 'git')).toBe(true);
    expect(gitCalls(after).filter((line) => line !== 'switch main')).toEqual(
      [],
    );
    expect(run.started()).toBe(false);
    expect(restoreCalls(run.calls)).toHaveLength(1);
    neverForced(run.calls);
    return { run, code, fake };
  }

  it.each(signals)(
    'stops setup on %s during a setup command, restores once and exits',
    async (signal, status) => {
      const { run, code, fake } = await interruptDuring(
        (call) => call.args[0] === 'watchlist',
        signal,
      );
      expect(code).toBe(status);
      expect(run.exits).toEqual([status]);
      expect(fake.state.commit).toBe(other);
    },
  );

  it.each(signals)(
    'does not let the analysis start when %s kills the refresh',
    async (signal, status) => {
      const { run } = await interruptDuring(
        (call) => call.args[0] === 'refresh',
        signal,
        {},
        // The killed refresh exits 1, which the setup would otherwise accept.
        () => ({ code: 1, stdout: '', stderr: '' }),
      );
      expect(run.exits).toEqual([status]);
      expect(run.calls.some((call) => call.args.includes('--save-run'))).toBe(
        false,
      );
    },
  );

  it('attempts one unforced restore when the signal arrives during the switch', async () => {
    const { run, fake } = await interruptDuring(
      (call) => call.args.includes('--detach'),
      'SIGTERM',
      {},
      undefined,
      false,
    );
    expect(run.exits).toEqual([143]);
    expect(fake.state.commit).toBe(other);
  });

  it('says "not restored" when the restore after a signal fails', async () => {
    const { run } = await interruptDuring(
      (call) => call.args.includes('--detach'),
      'SIGHUP',
      { restoreCode: 1 },
      undefined,
      false,
    );
    expect(run.out.join('')).toContain('The engine checkout was NOT restored');
  });

  it('restores on SIGTERM and SIGHUP while the application runs', async () => {
    for (const [signal, status] of [
      ['SIGTERM', 143],
      ['SIGHUP', 129],
    ] as const) {
      const fake = engine();
      const run = machine(fake.script);
      const done = runSandbox(run.deps, []);
      await flush();
      expect(run.started()).toBe(true);
      run.signals.emit(signal);
      await flush();
      expect(run.exits).toEqual([status]);
      expect(restoreCalls(run.calls)).toEqual(['switch main']);
      run.endApplication(1);
      await done;
      expect(restoreCalls(run.calls)).toEqual(['switch main']);
    }
  });

  it('leaves Ctrl+C to the application while it runs, then restores', async () => {
    const fake = engine();
    const run = machine(fake.script);
    const done = runSandbox(run.deps, []);
    await flush();
    run.signals.emit('SIGINT');
    await flush();
    expect(run.exits).toEqual([]);
    expect(restoreCalls(run.calls)).toEqual([]);
    run.endApplication(0);
    expect(await done).toBe(0);
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
  });

  it('never forces a failed restore: it says so and names the one command', async () => {
    const fake = engine({ restoreCode: 1 });
    const run = machine(fake.script, { exitCode: 0 });
    const code = await runSandbox(run.deps, []);
    expect(code).toBe(0);
    const text = run.out.join('');
    expect(text).toContain('The engine checkout was NOT restored');
    expect(text).toContain('local changes would be overwritten');
    expect(text).toContain(
      `Restore it yourself with:\ngit -C "${enginePath}" switch main`,
    );
    // One attempt, no retry, nothing forced.
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
    neverForced(run.calls);
  });

  it('has nothing to restore when the checkout was not switched', async () => {
    const run = machine(() => undefined, { exitCode: 0 });
    await runSandbox(run.deps, []);
    expect(run.calls.some((call) => call.file === 'git')).toBe(false);
  });
});

describe('arguments', () => {
  it('takes no options, and says so before running anything', async () => {
    const run = machine(() => undefined, { exitCode: 0 });
    for (const args of [['--checks', 'W1'], ['--engine=x'], ['x']]) {
      expect(await runSandbox(run.deps, args)).toBe(1);
    }
    expect(run.err.join('')).toContain('`pnpm sandbox` takes no options.');
    expect(run.calls).toHaveLength(0);
    expect(run.started()).toBe(false);
  });
});
