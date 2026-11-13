import { readFileSync } from 'node:fs';
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
  newSession,
  runSetup,
  stopMessages,
} from '../../tools/smoke/setup.ts';
import {
  readEngineVersion,
  readVendoredCommit,
  resolveIan,
} from '../../tools/smoke/source.ts';
import { SmokeStop } from '../../tools/smoke/types.ts';
import {
  dependencies,
  enginePath,
  healthy,
  ianPath,
  json,
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
        'S1. Read [the guide](https://example.test/guide) first. Then more.',
        '',
        'S2. Do this:',
        '',
        '```text',
        'N9. not a step',
        '```',
        '',
        'N1. A second line',
        'continues here.',
        '',
        'Not a step. S3. nor this.',
      ].join('\n'),
    );
    expect(steps).toEqual([
      { id: 'S1', hint: 'Read the guide first' },
      { id: 'S2', hint: 'Do this' },
      { id: 'N1', hint: 'A second line continues here' },
    ]);
  });

  it('finds well-formed, unique, ordered steps in SMOKE_TESTING.md', () => {
    const steps = parseSteps(smokeDocument);
    const ids = steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groups = ['S', 'N', 'W', 'R', 'H', 'E', 'L'];
    let lastGroup = -1;
    let lastNumber = 0;
    for (const id of ids) {
      expect(id).toMatch(/^[SNWRHEL][1-9]\d*$/);
      const group = groups.indexOf(id[0]!);
      const number = Number(id.slice(1));
      if (group === lastGroup) expect(number).toBe(lastNumber + 1);
      else {
        expect(group).toBeGreaterThan(lastGroup);
        expect(number).toBe(1);
      }
      lastGroup = group;
      lastNumber = number;
    }
    expect(ids.slice(0, 10)).toEqual([
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'S7',
      'S8',
      'S9',
      'S10',
    ]);
    for (const step of steps) expect(step.hint).not.toBe('');
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

  it('reads the engine version from the [project] table only', () => {
    expect(
      readEngineVersion(
        '[tool.x]\nversion = "9"\n\n[project]\nname = "n"\nversion = "1.2.3"\n\n[other]\nversion = "7"\n',
      ),
    ).toBe('1.2.3');
    expect(readEngineVersion('[project]\nname = "n"\n')).toBeNull();
  });

  it('resolves ian from IAD_IAN_PATH, else from PATH, else not at all', () => {
    const exists = (path: string) => path === 'C:\\bin\\ian.exe';
    expect(resolveIan({ IAD_IAN_PATH: 'X:\\ian.exe' }, 'win32', exists)).toBe(
      'X:\\ian.exe',
    );
    expect(resolveIan({ PATH: 'C:\\a;C:\\bin\\' }, 'win32', exists)).toBe(
      'C:\\bin\\ian.exe',
    );
    expect(
      resolveIan({ IAD_IAN_PATH: '', PATH: 'C:\\a' }, 'win32', exists),
    ).toBe(null);
  });
});

describe('record', () => {
  const steps = parseSteps(
    'S1. Get the engine.\n\nS2. Check the database.\n\nN1. Open the app.\n\nW1. List watchlists.\n',
  );
  const base = {
    date: '2026-11-13 09:05 (UTC-05:00)',
    timeZone: 'America/Toronto',
    operatingSystem: 'Windows_NT 10.0 (win32 x64)',
    applicationCommit: 'abc1234',
    dirty: false,
    engineCommit: 'beb58a2',
    enginePath: 'C:/tools/ian.exe',
    engineVersion: '0.1.0',
    data: { watchlists: 2, entries: 4, runs: 5, refreshes: 1 },
    throwawayFolder: '.tmp/smoke/20261113-090507',
    steps,
    scripted: new Map([
      ['S1', { fact: 'engine at beb58a2' }],
      ['S2', {}],
    ]),
    log: [{ command: 'ian --help', output: 'Usage\n' }],
    stopped: null,
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
        '- **Engine commit:** beb58a2, matches vendor/ian/SOURCE.md',
        "- **Engine:** `ian` from C:/tools/ian.exe; version 0.1.0, from the engine checkout's pyproject.toml",
        '- **Data:** 2 watchlists, 4 entries, 5 runs, 1 refresh',
        '- **Throwaway folder:** .tmp/smoke/20261113-090507',
        '',
        'Mark each step `pass`, `fail`, `n/a` or `note`, with a few words for anything that is not a plain pass. A failure note never includes private data.',
        '',
        '## Setup (scripted)',
        '',
        '- **S1** Get the engine: pass (scripted) (engine at beb58a2)',
        '- **S2** Check the database: pass (scripted)',
        '',
        '<details><summary>Command output</summary>',
        '',
        '````text',
        '> ian --help',
        'Usage',
        '````',
        '',
        '</details>',
        '',
        '## Checks',
        '',
        '- **N1** Open the app:',
        '- **W1** List watchlists:',
        '',
        '**Result:** all steps passed | failing step numbers, with notes',
        '',
      ].join('\n'),
    );
  });

  it('notes uncommitted changes', () => {
    expect(renderRecord({ ...base, dirty: true })).toContain(
      '- **Application commit:** abc1234 (with uncommitted changes)',
    );
  });

  it('shows where the tool stopped, and leaves later steps unmarked', () => {
    const text = renderRecord({
      ...base,
      scripted: new Map([['S1', {}]]),
      stopped: { step: 'S2', message: 'No.' },
    });
    expect(text).toContain('- **S2** Check the database:\n');
    expect(text).toContain('**Result:** stopped at S2: No.');
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
});

describe('setup', () => {
  it('folder names and the database URL follow SMOKE_TESTING.md', () => {
    expect(folderStamp(new Date(2026, 0, 2, 3, 4, 5))).toBe('20260102-030405');
    expect(databaseUrlFor('C:\\repo\\.tmp\\smoke\\x')).toBe(
      'sqlite:///C:/repo/.tmp/smoke/x/smoke-test.sqlite3',
    );
  });

  it('runs every step on a healthy engine and records the facts', async () => {
    const { deps, calls, folders } = dependencies(healthy());
    const before = process.env.IAN_DATABASE_URL;
    const session = newSession();

    await runSetup(deps, session);

    expect([...session.scripted.keys()]).toEqual([
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'S7',
      'S8',
      'S9',
    ]);
    expect(session.data).toEqual({
      watchlists: 2,
      entries: 4,
      runs: 5,
      refreshes: 1,
    });
    expect(session.engineVersion).toBe('0.1.0');
    expect(session.engineCommit).toBe(vendoredCommit.slice(0, 7));
    expect(session.ianPath).toBe(ianPath);
    expect(session.throwawayFolder).toBe('.tmp/smoke/20261113-090507');
    expect(folders).toHaveLength(1);
    // S2 reads the real database with the inherited environment; every later
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
    options: { pathless?: boolean; noEngine?: boolean } = {},
  ) {
    const { deps } = dependencies(
      healthy(script),
      {},
      {
        ...(options.pathless ? { env: { PATH: '' } } : {}),
        ...(options.noEngine ? { enginePath: `${enginePath}-missing` } : {}),
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

  it('stops when the engine folder does not exist', async () => {
    await stopsAt(() => undefined, 'S1', /does not exist/, { noEngine: true });
  });

  it('stops when the folder is not a Git checkout', async () => {
    await stopsAt(
      (call) =>
        call.file === 'git'
          ? { code: 128, stdout: '', stderr: 'no' }
          : undefined,
      'S1',
      /not a Git checkout/,
    );
  });

  it('stops when the engine is at another commit, naming the command to run', async () => {
    const other = 'a'.repeat(40);
    await stopsAt(
      (call) =>
        call.file === 'git'
          ? { code: 0, stdout: `${other}\n`, stderr: '' }
          : undefined,
      'S1',
      new RegExp(`${other}.*${vendoredCommit}.*checkout ${vendoredCommit}`),
    );
  });

  it('stops when ian cannot be found', async () => {
    await stopsAt(() => undefined, 'S1', /`ian` command was not found/, {
      pathless: true,
    });
  });

  it('stops when ian --help fails', async () => {
    await stopsAt(
      (call) =>
        call.args.join(' ') === '--help'
          ? { code: 2, stdout: '', stderr: '' }
          : undefined,
      'S1',
      /ian --help. did not succeed/,
    );
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
    expect(session.scripted.get('S2')?.fact).toBe('real database: missing');
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
      'S2',
      message,
    );
  });

  it('stops when the real database state cannot be read', async () => {
    await stopsAt(
      (call) =>
        call.args.join(' ') === readCommands.databaseStatus.join(' ')
          ? { code: 1, stdout: 'not json', stderr: '' }
          : undefined,
      'S2',
      /could not be read/,
    );
  });

  it('stops, keeping the record so far, when a setup command fails', async () => {
    const session = await stopsAt(
      (call) =>
        call.args[0] === 'watchlist' && call.args[1] === 'create'
          ? { code: 1, stdout: 'x', stderr: 'y' }
          : undefined,
      'S5',
      /Step S5 failed/,
    );
    expect([...session.scripted.keys()]).toEqual(['S1', 'S2', 'S3', 'S4']);
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
    expect(session.scripted.get('S7')?.fact).toMatch(/exited 1/);
  });

  it('stops when the refresh completed no run', async () => {
    await stopsAt(
      (call) =>
        call.args.join(' ') === readCommands.refreshes.join(' ')
          ? json({
              items: [{ run_count: 4, outcome_counts: { completed: 0 } }],
            })
          : undefined,
      'S7',
      new RegExp(stopMessages.noCompletedRun().slice(0, 30)),
    );
  });

  it.each([
    ['runs', { items: [1, 2, 3].map((n) => ({ n })), has_more: false }],
    [
      'refreshes',
      { items: [{ run_count: 3, outcome_counts: { completed: 3 } }] },
    ],
    ['watchlists', { items: [{ entry_count: 5 }, { entry_count: 0 }] }],
  ] as const)(
    "stops when the %s counts are not the setup's",
    async (which, body) => {
      const command = readCommands[which].join(' ');
      let seen = 0;
      await stopsAt(
        (call) => {
          if (call.args.join(' ') !== command) return undefined;
          // The refresh check after S7 must still pass; only the S9 read differs.
          seen += 1;
          if (which === 'refreshes' && seen === 1) return undefined;
          return json(body);
        },
        'S9',
        /should leave 5 runs/,
      );
    },
  );
});
