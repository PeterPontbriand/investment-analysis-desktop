import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readCommands } from '../../tools/sandbox/commands.ts';
import {
  databaseUrlFor,
  folderStamp,
  applicationEnvironment,
  newSession,
  runSetup,
  stopMessages,
} from '../../tools/sandbox/setup.ts';
import {
  readVendoredCommit,
  resolveIan,
  resolveIanInUv,
} from '../../tools/engine/source.ts';
import { SandboxStop } from '../../tools/sandbox/stop.ts';
import type { Runner } from '../../tools/engine/types.ts';
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
} from './sandbox-fixtures.ts';

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

describe('setup', () => {
  it('names the folder after the time and builds the database URL from it', () => {
    expect(folderStamp(new Date(2026, 0, 2, 3, 4, 5))).toBe('20260102-030405');
    expect(databaseUrlFor('C:\\repo\\.tmp\\sandbox\\x')).toBe(
      'sqlite:///C:/repo/.tmp/sandbox/x/sandbox.sqlite3',
    );
  });

  it('prints one progress line per stage, in order, naming the provider stages', async () => {
    const { deps, progress } = dependencies(healthy());

    await runSetup(deps, newSession());
    expect(progress).toEqual([
      'Engine: finding the engine through `ian` and checking its commit…',
      'Folder: creating the throwaway database folder .tmp/sandbox/20261113-090507…',
      "Database: creating the throwaway database's schema…",
      'Watchlists: creating the Sandbox, Sandbox Empty and Sandbox Scratch watchlists…',
      'Entries: adding five entries to the Sandbox watchlist and six to Sandbox Scratch…',
      'Refresh: refreshing the Sandbox watchlist (this calls the data providers and can take a few minutes)…',
      'Analysis: saving one direct analysis of MSFT (this calls the data providers and can take a minute)…',
      'Counts: reading back the saved runs, refreshes and watchlists to check their counts…',
      'Sample data: 6 runs, 1 refresh(es) of 5 runs, 3 watchlists with 11 entries.',
    ]);
    for (const line of progress) {
      expect(line).not.toContain(repositoryRoot);
      expect(line).not.toMatch(/token|sqlite:/i);
    }
  });

  it('runs every stage on a healthy engine and uses the throwaway database for each command', async () => {
    const { deps, calls, folders } = dependencies(healthy());
    const before = process.env.IAN_DATABASE_URL;
    const session = newSession();

    await runSetup(deps, session);

    expect(session.data).toEqual({
      watchlists: 3,
      entries: 11,
      runs: 6,
      refreshes: 1,
    });
    expect(session.engineCommit).toBe(vendoredCommit.slice(0, 7));
    expect(session.ianPath).toBe(ianPath);
    expect(session.throwawayFolder).toBe('.tmp/sandbox/20261113-090507');
    expect(folders).toHaveLength(1);
    // Every command that changes data gets the throwaway database.
    const later = calls.filter((call) => call.args[0] === 'watchlist');
    expect(later.length).toBeGreaterThan(0);
    for (const call of later)
      expect(call.options?.env?.IAN_DATABASE_URL).toBe(session.databaseUrl);
    expect(session.databaseUrl).toMatch(
      /^sqlite:\/\/\/.*\/\.tmp\/sandbox\/20261113-090507\/sandbox\.sqlite3$/,
    );
    expect(process.env.IAN_DATABASE_URL).toBe(before);
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
    expect(error).toBeInstanceOf(SandboxStop);
    expect((error as SandboxStop).step).toBe(expectedStep);
    expect((error as SandboxStop).message).toMatch(message);
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
      expect((error as SandboxStop).step).toBe('Engine');
      expect((error as SandboxStop).message).toMatch(
        /without a shell.*executable \(\.exe\), not a \.cmd or \.bat file/,
      );
    },
  );

  it('stops when ian cannot be found', async () => {
    await stopsAt(
      () => undefined,
      'Engine',
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
    });

    it.each([
      ['uv is missing', { code: null, stdout: '', stderr: 'spawn uv ENOENT' }],
      ['uv fails', { code: 2, stdout: '', stderr: 'no' }],
      ['uv names an empty folder', { code: 0, stdout: '\n', stderr: '' }],
    ])('stops with the not-found message when %s', async (_name, answer) => {
      await stopsAt(
        (call) => (call.file === 'uv' ? answer : undefined),
        'Engine',
        /was not found on PATH or in uv's command folder\. Follow the engine's installation guide, "Make the `ian` command available" step, then open a new terminal and try again\./,
        { pathless: true },
      );
    });

    it('stops when uv names a folder that holds no ian', async () => {
      await stopsAt(uvAnswers, 'Engine', /not found on PATH or in uv's/, {
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

  it('stops, keeping the log so far, when a setup command fails', async () => {
    const session = await stopsAt(
      (call) =>
        call.args[0] === 'watchlist' && call.args[1] === 'create'
          ? { code: 1, stdout: 'x', stderr: 'y' }
          : undefined,
      'Watchlists',
      /Watchlists failed/,
    );
    expect(session.log.at(-1)?.command).toBe('ian watchlist create Sandbox');
  });

  it('allows a refresh that exits 1 when it completed a run', async () => {
    const { deps } = dependencies(
      healthy((call) =>
        call.args[0] === 'refresh'
          ? { code: 1, stdout: '', stderr: '' }
          : undefined,
      ),
    );
    await runSetup(deps, newSession());
  });

  it('stops when the refresh completed no run', async () => {
    await stopsAt(
      (call) =>
        call.args.join(' ') === readCommands.refreshes.join(' ')
          ? json({
              items: [{ run_count: 4, outcome_counts: { completed: 0 } }],
            })
          : undefined,
      'Refresh',
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
          // The refresh check after refresh must still pass; only the final read differs.
          seen += 1;
          if (which === 'refreshes' && seen === 1) return undefined;
          return json(body);
        },
        'Counts',
        /should leave 6 runs/,
      );
    },
  );
});
