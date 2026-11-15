import { describe, expect, it } from 'vitest';
import {
  EngineProblem,
  engineMessages,
  parseAbout,
} from '../../tools/smoke/engine.ts';
import { renderRecord } from '../../tools/smoke/record.ts';
import { parseSteps } from '../../tools/smoke/document.ts';
import {
  checkArguments,
  runSmoke,
  type RunDependencies,
  type StopSignal,
} from '../../tools/smoke/run.ts';
import {
  newSession,
  runSetup,
  stopMessages,
  type Session,
} from '../../tools/smoke/setup.ts';
import { SmokeStop } from '../../tools/smoke/types.ts';
import {
  aboutJson,
  dependencies,
  enginePath,
  healthy,
  repositoryRoot,
  vendoredCommit,
  type Call,
  type Script,
} from './smoke-fixtures.ts';

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
  expect(error).toBeInstanceOf(SmokeStop);
  return { error: error as SmokeStop, calls };
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
    expect(error.step).toBe('Step 1');
    expect(error.message).toBe(engineMessages.aboutUnknown());
    expect(error.message).toMatch(/older than .*API\.10.*Update your engine/);
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

  it('records what ian about said without the installation folder', async () => {
    const { deps } = dependencies(healthy());
    const session = newSession();
    await runSetup(deps, session);
    const text = JSON.stringify(session.log);
    expect(text).toContain('ian about --json');
    expect(text).toContain('commit: ' + vendoredCommit);
    expect(text).not.toContain(enginePath.replaceAll('\\', '\\\\'));
    expect(session.engineVersion).toBe('0.1.0');
    expect(session.engineFolder).toBe(enginePath);
  });

  it('is an EngineProblem the callers turn into their own stop', () => {
    expect(new EngineProblem('x')).toBeInstanceOf(Error);
  });
});

describe('switching the engine checkout', () => {
  it('switches a clean checkout after Step 2, to the vendored commit, detached', async () => {
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
    // The real database is read with the contributor's engine before the
    // switch; every later ian command uses the throwaway database.
    const switchAt = calls.findIndex((call) => call.args.includes('switch'));
    const statusAt = calls.findIndex(
      (call) => call.args.join(' ') === 'db status --json',
    );
    expect(statusAt).toBeGreaterThan(-1);
    expect(statusAt).toBeLessThan(switchAt);
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

  it('continues at the vendored commit with uncommitted changes, and notes them', async () => {
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
    expect(session.engineUncommitted).toBe(true);
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
    expect(error.step).toBe('Step 1');
    expect(error.message).toBe(stopMessages.commitMissing(vendoredCommit));
    expect(gitCalls(calls)).toContain('fetch origin');
    expect(calls.some((call) => call.args.includes('switch'))).toBe(false);
    expect(session.engineSwitch).toBeNull();
    // Nothing after Step 1 ran.
    expect(session.scripted.has('Step 2')).toBe(false);
  });

  it.each([
    ['has uncommitted changes', true, /it has uncommitted changes/],
    ['has a status Git could not read', null, /could not say whether/],
  ])('refuses to switch a checkout that %s', async (_name, dirty, message) => {
    const fake = engine({ dirty });
    const session = newSession();
    const { error, calls } = await stopOf(session, fake.script);
    expect(error.step).toBe('Step 1');
    expect(error.message).toMatch(message);
    expect(error.message).toMatch(/will not switch it/);
    expect(calls.some((call) => call.file === 'git')).toBe(false);
    expect(session.engineSwitch).toBeNull();
  });

  it('stops, with nothing to restore, when the switch itself fails', async () => {
    const fake = engine({ switchCode: 1 });
    const session = newSession();
    const { error } = await stopOf(session, fake.script);
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
    expect(error.message).toBe(
      stopMessages.switchedToWrongCommit('aaaaaaa', vendoredCommit.slice(0, 7)),
    );
    // The switch happened, so the run still has the checkout to restore.
    expect(session.engineSwitch?.state).toBe('switched');
  });
});

// A fake machine for the whole run: signals the test can send, an application
// the test controls, and a record that remembers the engine state each time it
// was written.
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
  const writes: { state: string | null; stopped: string | null }[] = [];
  const exits: number[] = [];
  let application: ((code: number) => void) | null = null;
  let started = false;
  const deps: RunDependencies = {
    setup: made.deps,
    signals,
    startApplication: (env) => {
      started = true;
      expect(env.IAN_DATABASE_URL).toMatch(/smoke-test\.sqlite3$/);
      if (options.exitCode !== undefined)
        return Promise.resolve(options.exitCode);
      return new Promise<number>((resolve) => {
        application = resolve;
      });
    },
    writeRecord: (session, stopped) => {
      writes.push({
        state: session.engineSwitch?.state ?? null,
        stopped: stopped?.step ?? null,
      });
      return Promise.resolve('record.md');
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
    writes,
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
  it('restores when setup stops, before the record is written', async () => {
    const fake = engine();
    const run = machine((call) =>
      call.args.join(' ') === 'db upgrade'
        ? { code: 3, stdout: '', stderr: '' }
        : fake.script(call),
    );
    const code = await runSmoke(run.deps, []);
    expect(code).toBe(1);
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
    expect(fake.state.commit).toBe(other);
    expect(run.writes).toEqual([{ state: 'restored', stopped: 'Step 4' }]);
    expect(run.started()).toBe(false);
    expect(run.signals.count()).toBe(0);
    neverForced(run.calls);
  });

  it.each([0, 1, 137])(
    'restores when the application exits with status %i, and rewrites the record',
    async (exitCode) => {
      const fake = engine();
      const run = machine(fake.script, { exitCode });
      const code = await runSmoke(run.deps, []);
      expect(code).toBe(exitCode);
      expect(restoreCalls(run.calls)).toEqual(['switch main']);
      // Written once before the application, with the restore still to come,
      // and last after the restore.
      expect(run.writes.at(0)?.state).toBe('switched');
      expect(run.writes.at(-1)?.state).toBe('restored');
      expect(run.out.join('')).toContain(
        `restore it with: git -C "${enginePath}" switch main`,
      );
      expect(run.signals.count()).toBe(0);
    },
  );

  it('restores when something throws, and leaves the error', async () => {
    const fake = engine();
    const run = machine(fake.script);
    run.deps.startApplication = () => Promise.reject(new Error('spawn failed'));
    await expect(runSmoke(run.deps, [])).rejects.toThrow('spawn failed');
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
    expect(run.signals.count()).toBe(0);
  });

  it('restores a detached checkout with git switch --detach', async () => {
    const fake = engine({ branch: null });
    const run = machine(fake.script, { exitCode: 0 });
    await runSmoke(run.deps, []);
    expect(restoreCalls(run.calls)).toEqual([`switch --detach ${other}`]);
  });

  it.each([
    ['SIGTERM', 143],
    ['SIGHUP', 129],
    ['SIGINT', 130],
  ] as const)(
    'restores on %s while the application waits for setup to end',
    async (signal, status) => {
      const fake = engine();
      // The signal arrives during Step 4, as a contributor's Ctrl+C would.
      let sent = false;
      const run = machine((call) => {
        if (!sent && call.args.join(' ') === 'db upgrade') {
          sent = true;
          run.signals.emit(signal);
        }
        return fake.script(call);
      });
      run.deps.startApplication = () => Promise.resolve(0);
      await runSmoke(run.deps, []);
      await flush();
      expect(run.exits).toEqual([status]);
      // One restore, though the run's own end asks for one too.
      expect(restoreCalls(run.calls)).toEqual(['switch main']);
      expect(run.writes.some((w) => w.stopped === 'Interrupted')).toBe(true);
    },
  );

  it('restores on SIGTERM and SIGHUP while the application runs', async () => {
    for (const [signal, status] of [
      ['SIGTERM', 143],
      ['SIGHUP', 129],
    ] as const) {
      const fake = engine();
      const run = machine(fake.script);
      const done = runSmoke(run.deps, []);
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
    const done = runSmoke(run.deps, []);
    await flush();
    run.signals.emit('SIGINT');
    await flush();
    expect(run.exits).toEqual([]);
    expect(restoreCalls(run.calls)).toEqual([]);
    run.endApplication(0);
    expect(await done).toBe(0);
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
  });

  it('never forces a failed restore: it says so, names the one command, and records it', async () => {
    const fake = engine({ restoreCode: 1 });
    const run = machine(fake.script, { exitCode: 0 });
    const code = await runSmoke(run.deps, []);
    expect(code).toBe(0);
    const text = run.out.join('');
    expect(text).toContain('The engine checkout was NOT restored');
    expect(text).toContain('local changes would be overwritten');
    expect(text).toContain(
      `Restore it yourself with:\ngit -C "${enginePath}" switch main`,
    );
    expect(run.writes.at(-1)?.state).toBe('not-restored');
    // One attempt, no retry, nothing forced.
    expect(restoreCalls(run.calls)).toEqual(['switch main']);
    neverForced(run.calls);
  });

  it('has nothing to restore when the checkout was not switched', async () => {
    const run = machine(() => undefined, { exitCode: 0 });
    await runSmoke(run.deps, []);
    expect(run.calls.some((call) => call.file === 'git')).toBe(false);
    expect(run.writes.map((w) => w.state)).toEqual([null]);
  });
});

describe('arguments', () => {
  it.each([['--engine', 'C:/engine'], ['--engine=C:/engine']])(
    'stops with one line when --engine is passed (%s)',
    async (...args) => {
      const run = machine(() => undefined);
      expect(await runSmoke(run.deps, args)).toBe(1);
      expect(run.err).toEqual([
        '`--engine` is no longer needed: `pnpm smoke` finds the engine through `ian`. Run `pnpm smoke` without it.\n',
      ]);
      expect(run.calls).toEqual([]);
    },
  );

  it('takes no other arguments either', () => {
    expect(checkArguments(['x'])).toBe('`pnpm smoke` takes no arguments.');
    expect(checkArguments([])).toBeNull();
  });
});

describe('the engine line of the record', () => {
  const steps = parseSteps('Step 1. Get the engine.\n');
  const base = {
    date: 'd',
    timeZone: 'z',
    operatingSystem: 'o',
    applicationCommit: 'c',
    dirty: false,
    engineCommit: 'beb58a2',
    ianSource: 'PATH' as const,
    engineVersion: '0.1.0',
    engineUncommitted: false,
    engineSwitch: null,
    data: null,
    throwawayFolder: '.tmp/smoke/x',
    steps,
    scripted: new Map(),
    log: [],
    stopped: null,
  };
  const line = (input: Partial<Parameters<typeof renderRecord>[0]>) =>
    renderRecord({ ...base, ...input })
      .split('\n')
      .filter((text) => /^- \*\*(Engine|Restore command):/.test(text));

  it.each([
    ['restored', 'switched from branch `main` and restored'],
    ['not-restored', 'switched and not restored'],
    [
      'switched',
      'switched from branch `main`, to be restored when the test ends',
    ],
  ] as const)('says a switched checkout is %s', (state, phrase) => {
    expect(
      line({
        engineSwitch: { start: { kind: 'branch', name: 'main' }, state },
      }),
    ).toEqual([
      `- **Engine:** beb58a2, matches vendor/ian/SOURCE.md; version 0.1.0, from \`ian about\`; \`ian\` from \`PATH\`; ${phrase}`,
      '- **Restore command:** `git -C <engine checkout> switch main`',
    ]);
  });

  it('names a detached start by its full commit', () => {
    expect(
      line({
        engineSwitch: {
          start: { kind: 'commit', commit: other },
          state: 'restored',
        },
      }),
    ).toEqual([
      expect.stringContaining(`switched from commit \`${other}\` and restored`),
      `- **Restore command:** \`git -C <engine checkout> switch --detach ${other}\``,
    ]);
  });

  it('notes uncommitted changes at the vendored commit, and never the folder', () => {
    const text = renderRecord({ ...base, engineUncommitted: true });
    expect(text).toContain(
      '; not switched; the engine checkout has uncommitted changes',
    );
    expect(text).not.toContain(enginePath);
    expect(text).not.toContain(repositoryRoot);
  });
});
