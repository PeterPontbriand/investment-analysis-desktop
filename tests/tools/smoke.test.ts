import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readCommands,
  setupCommands,
  splitCommandLine,
} from '../../tools/smoke/commands.ts';
import { parseSetupCommands, parseSteps } from '../../tools/smoke/document.ts';
import { renderRecord, scrub } from '../../tools/smoke/record.ts';
import {
  databaseUrlFor,
  folderStamp,
  applicationEnvironment,
  newSession,
  runSetup,
  stopMessages,
} from '../../tools/smoke/setup.ts';
import {
  readVendoredCommit,
  resolveIan,
  resolveIanInUv,
} from '../../tools/smoke/source.ts';
import { SmokeStop, type Runner } from '../../tools/smoke/types.ts';
import {
  dependencies,
  healthy,
  ianPath,
  json,
  uvBinFolder,
  uvIanPath,
  repositoryRoot,
  sourceRecord,
  vendoredCommit,
} from './smoke-fixtures.ts';

const smokeDocument = readFileSync('docs/project/SMOKE_TESTING.md', 'utf8');

describe('smoke test document steps', () => {
  it('reads steps, with links replaced by their text and fences ignored', () => {
    const steps = parseSteps(
      [
        '# Title',
        '',
        'Step 1. Read [the guide](https://example.test/guide) first. Then more.',
        '',
        'Step 2. Do this:',
        '',
        '```text',
        'N9. not a step',
        '```',
        '',
        'Check N1. A second line',
        'continues here.',
        '',
        'Not a step. S3. nor this.',
      ].join('\n'),
    );
    expect(steps).toEqual([
      { id: 'Step 1', hint: 'Read the guide first' },
      { id: 'Step 2', hint: 'Do this' },
      { id: 'Check N1', hint: 'A second line continues here' },
    ]);
  });

  it('finds well-formed, unique, ordered steps in SMOKE_TESTING.md', () => {
    const steps = parseSteps(smokeDocument);
    const ids = steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The setup steps come first and are numbered 1 upward.
    const setup = ids.filter((id) => id.startsWith('Step '));
    expect(ids.slice(0, setup.length)).toEqual(setup);
    expect(setup).toEqual(setup.map((_id, index) => `Step ${index + 1}`));
    expect(setup.length).toBeGreaterThan(0);
    // Each check group starts at 1 and goes up by one, in one run per letter.
    const checks = ids.slice(setup.length);
    const seen = new Set<string>();
    let letter = '';
    let last = 0;
    for (const id of checks) {
      const match = /^Check ([A-Z])([1-9]\d*)$/.exec(id);
      expect(match, `${id} is a well-formed check id`).not.toBeNull();
      const [, group, digits] = match!;
      const number = Number(digits);
      if (group === letter) expect(number).toBe(last + 1);
      else {
        expect(seen.has(group!), `${group} is not in two separate runs`).toBe(
          false,
        );
        seen.add(group!);
        expect(number).toBe(1);
      }
      letter = group!;
      last = number;
    }
    for (const step of steps) expect(step.hint).not.toBe('');
  });

  it('reads a check of a group letter it has not seen before', () => {
    const steps = parseSteps(
      'Step 1. Start.\n\nCheck Q1. A new group.\n\nCheck Q2. Its second check:\n',
    );
    expect(steps).toEqual([
      { id: 'Step 1', hint: 'Start' },
      { id: 'Check Q1', hint: 'A new group' },
      { id: 'Check Q2', hint: 'Its second check' },
    ]);
  });

  it('detects fences, indented or tilde, the way the step reader does', () => {
    const document = [
      'Step 4. Do it:',
      '',
      '  ```powershell',
      '  ian db upgrade',
      '  ```',
      '',
      '~~~text',
      'ian runs list',
      '~~~',
      '',
      'ian not-a-command-outside-a-fence',
      '',
      'Step 10. Start.',
    ].join('\n');
    expect(parseSetupCommands(document)).toEqual([
      ['db', 'upgrade'],
      ['runs', 'list'],
    ]);
    expect(
      parseSteps('Step 1. Real.\n\n  ```text\n  Step 2. Not a step.\n  ```\n'),
    ).toEqual([{ id: 'Step 1', hint: 'Real' }]);
  });

  it('keeps the setup commands in step with the document (drift check)', () => {
    expect(setupCommands.map((command) => command.args)).toEqual(
      parseSetupCommands(smokeDocument),
    );
  });

  it('splits a command line with quoted words', () => {
    expect(splitCommandLine('ian refresh "Smoke Test" --x')).toEqual([
      'ian',
      'refresh',
      'Smoke Test',
      '--x',
    ]);
  });
});

describe('sources', () => {
  it('reads the commit from the real source record and a fixture', () => {
    expect(readVendoredCommit(sourceRecord)).toBe(vendoredCommit);
    expect(
      readVendoredCommit(readFileSync('vendor/ian/SOURCE.md', 'utf8')),
    ).toMatch(/^[0-9a-f]{40}$/);
    expect(() => readVendoredCommit('no commit here')).toThrow();
  });

  it('resolves ian from IAD_IAN_PATH, else from PATH, else not at all', () => {
    const exists = (path: string) => path === 'C:\\bin\\ian.exe';
    expect(
      resolveIan({ IAD_IAN_PATH: 'X:\\ian.exe' }, 'win32', exists),
    ).toEqual({
      path: 'X:\\ian.exe',
      source: 'IAD_IAN_PATH',
    });
    expect(resolveIan({ PATH: 'C:\\a;C:\\bin\\' }, 'win32', exists)).toEqual({
      path: 'C:\\bin\\ian.exe',
      source: 'PATH',
    });
    expect(
      resolveIan({ IAD_IAN_PATH: '', PATH: 'C:\\a' }, 'win32', exists),
    ).toBe(null);
  });

  // Literal paths: these hold on every runner, whatever the host's platform.
  describe.each([
    {
      name: 'win32',
      separator: ';',
      folders: ['C:\\a', 'C:\\bin\\'],
      expected: 'C:\\bin\\ian.exe',
      uvFolder: 'C:\\Users\\x\\.local\\bin\\',
      uvExpected: 'C:\\Users\\x\\.local\\bin\\ian.exe',
    },
    {
      name: 'linux',
      separator: ':',
      folders: ['/a', '/usr/local/bin/'],
      expected: '/usr/local/bin/ian',
      uvFolder: '/home/x/.local/bin/',
      uvExpected: '/home/x/.local/bin/ian',
    },
  ])('on $name', (c) => {
    it('finds ian on PATH with the platform separator, joiner and file name', () => {
      const exists = (path: string) => path === c.expected;
      expect(
        resolveIan({ PATH: c.folders.join(c.separator) }, c.name, exists),
      ).toEqual({ path: c.expected, source: 'PATH' });
    });

    it("finds ian in uv's command folder with the platform joiner and file name", async () => {
      const run: Runner = () =>
        Promise.resolve({ code: 0, stdout: `${c.uvFolder}\n`, stderr: '' });
      const exists = (path: string) => path === c.uvExpected;
      expect(await resolveIanInUv(run, {}, c.name, exists)).toEqual({
        path: c.uvExpected,
        source: 'uv',
      });
      expect(await resolveIanInUv(run, {}, c.name, () => false)).toBeNull();
    });
  });
});

describe('record', () => {
  const steps = parseSteps(
    'Step 1. Get the engine.\n\nStep 2. Check the database.\n\nCheck N1. Open the app.\n\nCheck W1. List watchlists.\n',
  );
  const base = {
    date: '2026-11-13 09:05 (UTC-05:00)',
    timeZone: 'America/Toronto',
    operatingSystem: 'Windows_NT 10.0 (win32 x64)',
    applicationCommit: 'abc1234',
    dirty: false,
    engineCommit: 'beb58a2',
    ianSource: 'PATH' as const,
    engineVersion: '0.1.0',
    engineUncommitted: false,
    engineSwitch: null,
    data: { watchlists: 2, entries: 5, runs: 6, refreshes: 1 },
    throwawayFolder: '.tmp/smoke/20261113-090507',
    steps,
    scripted: new Map([
      ['Step 1', { fact: 'engine at beb58a2' }],
      ['Step 2', {}],
    ]),
    log: [{ command: 'ian about --json', output: 'engine_version: 0.1.0' }],
    stopped: null,
    targeted: null,
  };

  it('renders the layout from fixed inputs', () => {
    expect(renderRecord(base)).toBe(
      [
        '# Smoke test record',
        '',
        '- **Date:** 2026-11-13 09:05 (UTC-05:00)',
        '- **Time zone:** America/Toronto',
        '- **Operating system:** Windows_NT 10.0 (win32 x64)',
        '- **Application commit:** abc1234',
        '- **Engine:** beb58a2, matches vendor/ian/SOURCE.md; version 0.1.0, from `ian about`; `ian` from `PATH`; not switched',
        '- **Data:** 2 watchlists, 5 entries, 6 runs, 1 refresh',
        '- **Throwaway folder:** .tmp/smoke/20261113-090507',
        '',
        'Mark each step `pass`, `fail`, `n/a`, `not run` or `note`, with a few words for anything that is not a plain pass. Use `n/a` when a check does not apply and `not run` for a check outside a targeted run. A failure note never includes private data.',
        '',
        '## Setup (scripted)',
        '',
        '- **Step 1** Get the engine: pass (scripted) (engine at beb58a2)',
        '- **Step 2** Check the database: pass (scripted)',
        '',
        '<details><summary>Command output</summary>',
        '',
        '````text',
        '> ian about --json',
        'engine_version: 0.1.0',
        '````',
        '',
        '</details>',
        '',
        '## Checks',
        '',
        '- **Check N1** Open the app:',
        '- **Check W1** List watchlists:',
        '',
        '**Result:** all steps passed | failing step numbers, with notes',
        '',
      ].join('\n'),
    );
  });

  it.each([
    ['IAD_IAN_PATH', '`IAD_IAN_PATH`'],
    ['PATH', '`PATH`'],
    ['uv', "uv's command folder"],
  ] as const)('names %s as where ian came from', (ianSource, name) => {
    expect(renderRecord({ ...base, ianSource })).toContain(
      `; \`ian\` from ${name}; not switched`,
    );
  });

  it('notes uncommitted changes', () => {
    expect(renderRecord({ ...base, dirty: true })).toContain(
      '- **Application commit:** abc1234 (with uncommitted changes)',
    );
  });

  it('leaves a step the tool only started to the contributor to mark', () => {
    const text = renderRecord({
      ...base,
      scripted: new Map([
        ['Step 1', {}],
        [
          'Step 2',
          {
            fact: 'the tool started the application; mark whether its window opened',
            leftToYou: true,
          },
        ],
      ]),
    });
    expect(text).toContain(
      '- **Step 2** Check the database: (the tool started the application; mark whether its window opened)',
    );
    expect(text).not.toContain('Step 2** Check the database: pass');
  });

  it('shows where the tool stopped, and leaves later steps unmarked', () => {
    const text = renderRecord({
      ...base,
      scripted: new Map([['Step 1', {}]]),
      stopped: { step: 'Step 2', message: 'No.' },
    });
    expect(text).toContain('- **Step 2** Check the database:\n');
    expect(text).toContain('**Result:** stopped at Step 2: No.');
  });

  it('marks Steps 1 to 9 pass (scripted) for the session a happy run produced', async () => {
    const { deps } = dependencies(healthy());
    const session = newSession();
    await runSetup(deps, session);

    const text = renderRecord({
      ...base,
      steps: parseSteps(smokeDocument),
      scripted: session.scripted,
      log: session.log,
    });

    // A key mismatch between the setup and the record fails here.
    for (let step = 1; step <= 9; step += 1)
      expect(text).toMatch(
        new RegExp(`- \\*\\*Step ${step}\\*\\* [^\\n]*: pass \\(scripted\\)`),
      );
    expect(text).not.toMatch(/- \*\*Step 10\*\* [^\n]*pass \(scripted\)/);
  });

  it('removes tokens and the repository path, never the engine path', () => {
    const secret = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const text = scrub(
      `{"port": 1, "token": "${secret}"} at ${repositoryRoot}\\.tmp token=${secret}`,
      repositoryRoot,
    );
    expect(text).not.toContain(secret);
    expect(text).not.toContain(repositoryRoot);
    expect(text).toContain('<repository>');
  });

  it('removes a Windows folder in every form `ian` prints it', () => {
    const root = 'E:\\Source\\repo';
    const text = scrub(
      [
        'Database: "E:\\\\Source\\\\repo\\\\.tmp\\\\x.sqlite3"',
        'plain E:\\Source\\repo\\.tmp and forward E:/Source/repo/.tmp',
      ].join('\n'),
      root,
      'E:\\Source\\engine',
    );
    expect(text).not.toMatch(/Source/);
    expect(text).toContain('"<repository>\\\\.tmp\\\\x.sqlite3"');
  });
});

describe('setup', () => {
  it('folder names and the database URL follow SMOKE_TESTING.md', () => {
    expect(folderStamp(new Date(2026, 0, 2, 3, 4, 5))).toBe('20260102-030405');
    expect(databaseUrlFor('C:\\repo\\.tmp\\smoke\\x')).toBe(
      'sqlite:///C:/repo/.tmp/smoke/x/smoke-test.sqlite3',
    );
  });

  it('prints one progress line per step, in order, naming the provider steps', async () => {
    const { deps, progress } = dependencies(healthy());

    await runSetup(deps, newSession());

    expect(progress).toEqual([
      'Step 1: finding the engine through `ian` and checking its commit…',
      'Step 2: reading the state of your real database (read only)…',
      'Step 3: creating the throwaway database folder .tmp/smoke/20261113-090507…',
      "Step 4: creating the throwaway database's schema…",
      'Step 5: creating the Smoke Test, Smoke Test Empty and Smoke Test Scratch watchlists…',
      'Step 6: adding five entries to the Smoke Test watchlist and six to Smoke Test Scratch…',
      'Step 7: refreshing the Smoke Test watchlist (this calls the data providers and can take a few minutes)…',
      'Step 8: saving one direct analysis of MSFT (this calls the data providers and can take a minute)…',
      'Step 9: reading back the saved runs, refreshes and watchlists to check their counts…',
    ]);
    for (const line of progress) {
      expect(line).not.toContain(repositoryRoot);
      expect(line).not.toMatch(/token|sqlite:/i);
    }
  });

  it('runs every step on a healthy engine and records the facts', async () => {
    const { deps, calls, folders } = dependencies(healthy());
    const before = process.env.IAN_DATABASE_URL;
    const session = newSession();

    await runSetup(deps, session);

    expect([...session.scripted.keys()]).toEqual([
      'Step 1',
      'Step 2',
      'Step 3',
      'Step 4',
      'Step 5',
      'Step 6',
      'Step 7',
      'Step 8',
      'Step 9',
    ]);
    expect(session.data).toEqual({
      watchlists: 3,
      entries: 11,
      runs: 6,
      refreshes: 1,
    });
    expect(session.engineVersion).toBe('0.1.0');
    expect(session.engineCommit).toBe(vendoredCommit.slice(0, 7));
    expect(session.ianPath).toBe(ianPath);
    expect(session.throwawayFolder).toBe('.tmp/smoke/20261113-090507');
    expect(folders).toHaveLength(1);
    // Step 2 reads the real database with the inherited environment; every later
    // command gets the throwaway database.
    const statusCall = calls.find(
      (call) => call.args.join(' ') === readCommands.databaseStatus.join(' '),
    );
    expect(statusCall?.options?.env?.IAN_DATABASE_URL).toBeUndefined();
    const later = calls.filter((call) => call.args[0] === 'watchlist');
    expect(later.length).toBeGreaterThan(0);
    for (const call of later)
      expect(call.options?.env?.IAN_DATABASE_URL).toBe(session.databaseUrl);
    expect(session.databaseUrl).toMatch(
      /^sqlite:\/\/\/.*\/\.tmp\/smoke\/20261113-090507\/smoke-test\.sqlite3$/,
    );
    expect(process.env.IAN_DATABASE_URL).toBe(before);
    // The real database's path never reaches the log.
    expect(JSON.stringify(session.log)).not.toContain('private');
  });

  async function stopsAt(
    script: Parameters<typeof healthy>[0],
    expectedStep: string,
    message: string | RegExp,
    options: { pathless?: boolean } = {},
  ) {
    const { deps } = dependencies(
      healthy(script),
      {},
      {
        ...(options.pathless ? { env: { PATH: '' } } : {}),
      },
    );
    const session = newSession();
    const error = await runSetup(deps, session).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(SmokeStop);
    expect((error as SmokeStop).step).toBe(expectedStep);
    expect((error as SmokeStop).message).toMatch(message);
    return session;
  }

  it.each(['C:/tools/ian.cmd', 'C:/tools/IAN.BAT'])(
    'stops when IAD_IAN_PATH names a batch file (%s)',
    async (path) => {
      const { deps } = dependencies(
        healthy(),
        {},
        { env: { IAD_IAN_PATH: path } },
      );
      const error = await runSetup(deps, newSession()).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect((error as SmokeStop).step).toBe('Step 1');
      expect((error as SmokeStop).message).toMatch(
        /without a shell.*executable \(\.exe\), not a \.cmd or \.bat file/,
      );
    },
  );

  it('stops when ian cannot be found', async () => {
    await stopsAt(
      () => undefined,
      'Step 1',
      /not found on PATH or in uv's command folder/,
      {
        pathless: true,
      },
    );
  });

  describe('finding ian', () => {
    const uvAnswers = (call: { file: string }) =>
      call.file === 'uv'
        ? { code: 0, stdout: `${uvBinFolder}\n`, stderr: '' }
        : undefined;
    const uvFiles = { [uvIanPath]: '' };

    it('prefers IAD_IAN_PATH, then PATH, and asks uv only when both fail', async () => {
      const configured = join(uvBinFolder, 'custom-ian');
      const first = dependencies(healthy(uvAnswers), uvFiles, {
        env: { IAD_IAN_PATH: configured, PATH: resolve('fake-bin') },
      });
      const one = newSession();
      await runSetup(first.deps, one);
      expect([one.ianSource, one.ianPath]).toEqual([
        'IAD_IAN_PATH',
        configured,
      ]);
      expect(first.calls.some((call) => call.file === 'uv')).toBe(false);

      const second = dependencies(healthy(uvAnswers), uvFiles);
      const two = newSession();
      await runSetup(second.deps, two);
      expect([two.ianSource, two.ianPath]).toEqual(['PATH', ianPath]);
      expect(second.calls.some((call) => call.file === 'uv')).toBe(false);

      const third = dependencies(healthy(uvAnswers), uvFiles, {
        env: { PATH: '' },
      });
      const three = newSession();
      await runSetup(third.deps, three);
      expect([three.ianSource, three.ianPath]).toEqual(['uv', uvIanPath]);
      const uvCall = third.calls.find((call) => call.file === 'uv');
      expect(uvCall?.args).toEqual(['tool', 'dir', '--bin']);
      expect(three.scripted.get('Step 1')?.fact).toMatch(
        /`ian` from uv's command folder/,
      );
    });

    it.each([
      ['uv is missing', { code: null, stdout: '', stderr: 'spawn uv ENOENT' }],
      ['uv fails', { code: 2, stdout: '', stderr: 'no' }],
      ['uv names an empty folder', { code: 0, stdout: '\n', stderr: '' }],
    ])('stops with the not-found message when %s', async (_name, answer) => {
      await stopsAt(
        (call) => (call.file === 'uv' ? answer : undefined),
        'Step 1',
        /was not found on PATH or in uv's command folder\. Do the engine's "Make the `ian` command available" step \(Step 1 of docs\/project\/SMOKE_TESTING\.md\), then open a new terminal and try again\./,
        { pathless: true },
      );
    });

    it('stops when uv names a folder that holds no ian', async () => {
      await stopsAt(uvAnswers, 'Step 1', /not found on PATH or in uv's/, {
        pathless: true,
      });
    });

    it('gives IAD_IAN_PATH to the application only, and only for ian from uv', async () => {
      const { deps, calls } = dependencies(healthy(uvAnswers), uvFiles, {
        env: { PATH: '', KEEP: 'yes' },
      });
      const before = process.env.IAD_IAN_PATH;
      const session = newSession();
      await runSetup(deps, session);

      const application = applicationEnvironment({ KEEP: 'yes' }, session);
      expect(application.IAD_IAN_PATH).toBe(uvIanPath);
      expect(application.IAN_DATABASE_URL).toBe(session.databaseUrl);
      // No command the tool ran, and not the tool's own environment, has it.
      for (const call of calls)
        expect(call.options?.env?.IAD_IAN_PATH).toBeUndefined();
      expect(deps.env.IAD_IAN_PATH).toBeUndefined();
      expect(process.env.IAD_IAN_PATH).toBe(before);

      const onPath = newSession();
      await runSetup(dependencies(healthy()).deps, onPath);
      expect(applicationEnvironment({}, onPath).IAD_IAN_PATH).toBeUndefined();
    });
  });

  it('continues on a missing real database, which exits 1', async () => {
    const { deps } = dependencies(
      healthy((call) =>
        call.args.join(' ') === readCommands.databaseStatus.join(' ')
          ? json({ state: 'missing' }, 1)
          : undefined,
      ),
    );
    const session = newSession();
    await runSetup(deps, session);
    expect(session.scripted.get('Step 2')?.fact).toBe('real database: missing');
  });

  it.each([
    ['upgrade_required', /needs an upgrade.*explicit upgrades/],
    [
      'incompatible_schema',
      /state incompatible_schema.*Local Database Operations/,
    ],
  ])('stops on the real database state %s', async (state, message) => {
    await stopsAt(
      (call) =>
        call.args.join(' ') === readCommands.databaseStatus.join(' ')
          ? json({ state }, 1)
          : undefined,
      'Step 2',
      message,
    );
  });

  it('stops when the real database state cannot be read', async () => {
    await stopsAt(
      (call) =>
        call.args.join(' ') === readCommands.databaseStatus.join(' ')
          ? { code: 1, stdout: 'not json', stderr: '' }
          : undefined,
      'Step 2',
      /could not be read/,
    );
  });

  it('stops, keeping the record so far, when a setup command fails', async () => {
    const session = await stopsAt(
      (call) =>
        call.args[0] === 'watchlist' && call.args[1] === 'create'
          ? { code: 1, stdout: 'x', stderr: 'y' }
          : undefined,
      'Step 5',
      /Step 5 failed/,
    );
    expect([...session.scripted.keys()]).toEqual([
      'Step 1',
      'Step 2',
      'Step 3',
      'Step 4',
    ]);
    expect(session.log.at(-1)?.command).toBe(
      'ian watchlist create "Smoke Test"',
    );
  });

  it('allows a refresh that exits 1 when it completed a run', async () => {
    const { deps } = dependencies(
      healthy((call) =>
        call.args[0] === 'refresh'
          ? { code: 1, stdout: '', stderr: '' }
          : undefined,
      ),
    );
    const session = newSession();
    await runSetup(deps, session);
    expect(session.scripted.get('Step 7')?.fact).toMatch(/exited 1/);
  });

  it('stops when the refresh completed no run', async () => {
    await stopsAt(
      (call) =>
        call.args.join(' ') === readCommands.refreshes.join(' ')
          ? json({
              items: [{ run_count: 4, outcome_counts: { completed: 0 } }],
            })
          : undefined,
      'Step 7',
      new RegExp(stopMessages.noCompletedRun().slice(0, 30)),
    );
  });

  it.each([
    ['runs', { items: [1, 2, 3, 4, 5].map((n) => ({ n })), has_more: false }],
    [
      'refreshes',
      { items: [{ run_count: 3, outcome_counts: { completed: 3 } }] },
    ],
    ['watchlists', { items: [{ entry_count: 4 }, { entry_count: 0 }] }],
  ] as const)(
    "stops when the %s counts are not the setup's",
    async (which, body) => {
      const command = readCommands[which].join(' ');
      let seen = 0;
      await stopsAt(
        (call) => {
          if (call.args.join(' ') !== command) return undefined;
          // The refresh check after Step 7 must still pass; only the Step 9 read differs.
          seen += 1;
          if (which === 'refreshes' && seen === 1) return undefined;
          return json(body);
        },
        'Step 9',
        /should leave 6 runs/,
      );
    },
  );
});
