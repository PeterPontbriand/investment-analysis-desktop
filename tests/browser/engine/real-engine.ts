// A real `ian serve` on a throwaway database for each worker, with the data the
// real-engine tests read. Nothing here uses the contributor's own database:
// every engine and every command gets IAN_DATABASE_URL for a new file under
// .tmp/engine-tests/.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { run } from '../../../tools/engine/process.ts';
import type { components } from '../../../src/api/schema.ts';
import { test as base, expect } from '../fixtures.ts';
import { appPort } from './port.ts';

export const appOrigin = `http://127.0.0.1:${appPort}`;

type Schemas = components['schemas'];

export type Profile = Schemas['InstrumentProfileDocument'];

// A ticker every provider lists, used to read what the engine serves for a
// real company without naming the company.
export const knownTicker = 'KO';
// A mistyped ticker no provider lists, and unlikely ever to be listed.
export const unknownTicker = 'ZZZZQ';
// The watchlist the setup creates, holding an entry for the known ticker.
export const watchlistName = 'Engine Tests';

export type Reply<T> = { status: number; body: T };

export type RealEngine = {
  origin: string;
  token: string;
  // The engine's answer to a request, as the application would see it.
  get<T = unknown>(path: string): Promise<Reply<T>>;
  post<T = unknown>(path: string, body?: unknown): Promise<Reply<T>>;
  // An `ian` command on the throwaway database.
  cli(args: string[]): Promise<{ code: number | null; output: string }>;
  // False when the data providers could not be reached from this machine.
  providers: boolean;
  // The id of a saved run of the known ticker; null when none could be saved.
  savedRunId: string | null;
  // The provider names the engine lists, by provider id.
  providerName(providerId: string | null): string | null;
  // The name the engine gives a code of a code set, from its help documents.
  termName(codeSet: string, code: string): Promise<string>;
  // The name of a glossary term by its id.
  termById(termId: string): Promise<string>;
};

// Runs without an SEC identity when asked to: the engine reads its identity
// from the settings folder's .env file or from SEC_USER_AGENT, so the run gets
// an empty settings folder and no variable (see the README of this folder).
const withoutIdentity = (env: NodeJS.ProcessEnv, folder: string) => {
  if (process.env.IAD_ENGINE_TEST_WITHOUT_SEC !== '1') return env;
  const settings = join(folder, 'settings');
  mkdirSync(settings, { recursive: true });
  const next: NodeJS.ProcessEnv = { ...env, IAN_CONFIG_DIR: settings };
  delete next.SEC_USER_AGENT;
  return next;
};

function stopEngine(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.pid === undefined) return resolve();
    child.once('close', () => resolve());
    // The server runs until its standard input closes.
    child.stdin?.end();
    setTimeout(() => {
      if (child.exitCode !== null) return;
      // On Windows the launcher starts the engine through uv, so end the tree.
      if (process.platform === 'win32')
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
        });
      else child.kill('SIGTERM');
    }, 5000);
    setTimeout(resolve, 15_000);
  });
}

async function startEngine(
  ian: string,
  env: NodeJS.ProcessEnv,
): Promise<{ child: ChildProcess; origin: string; token: string }> {
  const child = spawn(
    ian,
    ['serve', '--port', '0', '--allow-origin', appOrigin],
    { env, shell: false, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
  const line = await new Promise<string>((resolve, reject) => {
    let buffered = '';
    const timer = setTimeout(
      () => reject(new Error(`ian serve printed no address. ${stderr}`)),
      60_000,
    );
    child.stdout?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString();
      const end = buffered.indexOf('\n');
      if (end >= 0) {
        clearTimeout(timer);
        resolve(buffered.slice(0, end));
      }
    });
    child.on('error', (error) => reject(error));
    child.on('close', () =>
      reject(new Error(`ian serve ended at start. ${stderr}`)),
    );
  });
  const { port, token } = JSON.parse(line) as { port: number; token: string };
  return { child, origin: `http://127.0.0.1:${port}`, token };
}

export const test = base.extend<
  object,
  { engine: RealEngine; workerFolder: string }
>({
  workerFolder: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      const folder = join(
        process.env.IAD_ENGINE_TEST_FOLDER ?? '',
        `${workerInfo.project.name}-${workerInfo.workerIndex}`,
      );
      mkdirSync(folder, { recursive: true });
      await use(folder);
    },
    { scope: 'worker' },
  ],
  engine: [
    async ({ workerFolder }, use) => {
      const ian = process.env.IAD_ENGINE_TEST_IAN ?? '';
      const env = withoutIdentity(
        {
          ...process.env,
          IAN_DATABASE_URL: `sqlite:///${workerFolder.split('\\').join('/')}/engine-tests.sqlite3`,
        },
        workerFolder,
      );
      const cli: RealEngine['cli'] = async (args) => {
        const result = await run(ian, args, { env });
        return {
          code: result.code,
          output: `${result.stdout}${result.stderr}`,
        };
      };
      const upgraded = await cli(['db', 'upgrade']);
      if (upgraded.code !== 0)
        throw new Error(`ian db upgrade failed: ${upgraded.output}`);
      const started = await startEngine(ian, env);
      const call = async <T>(
        method: 'GET' | 'POST',
        path: string,
        body?: unknown,
      ): Promise<Reply<T>> => {
        const response = await fetch(`${started.origin}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${started.token}`,
            'Accept-Language': 'en',
            ...(body === undefined
              ? {}
              : { 'Content-Type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, body: (await response.json()) as T };
      };
      const get = <T>(path: string) => call<T>('GET', path);
      const info = (await get<Schemas['InfoDocument']>('/v1/info')).body;
      const names = new Map(
        info.providers.map((provider) => [provider.id, provider.name]),
      );
      const engine: RealEngine = {
        origin: started.origin,
        token: started.token,
        get,
        post: (path, body) => call('POST', path, body),
        cli,
        providers: false,
        savedRunId: null,
        providerName: (id) => (id === null ? null : (names.get(id) ?? id)),
        termById: async (termId) => {
          const index = (await get<Schemas['HelpIndexDocument']>('/v1/help'))
            .body;
          const term = index.groups
            .flatMap((group) => group.terms)
            .find((item) => item.id === termId);
          if (term === undefined)
            throw new Error(`The engine lists no term ${termId}.`);
          return term.name;
        },
        termName: async (codeSet, code) => {
          const references = (
            await get<Schemas['HelpReferencesDocument']>('/v1/help/references')
          ).body;
          const termId = references.code_sets[codeSet]?.[code];
          if (termId === undefined)
            throw new Error(`The engine names no term for ${codeSet} ${code}.`);
          return engine.termById(termId);
        },
      };
      // The data every test reads. With an SEC identity a lookup stores the known
      // ticker's profile; without one it only answers. When no provider answers,
      // the tests that need providers are skipped.
      engine.providers =
        (await engine.post(`/v1/instrument-profiles/${knownTicker}/lookup`))
          .status === 200;
      await cli(['watchlist', 'create', watchlistName]);
      await cli([
        'watchlist',
        'add-selection',
        'momentum',
        watchlistName,
        knownTicker,
      ]);
      if (engine.providers) {
        await cli(['momentum', knownTicker, '--save-run']);
        const runs = await get<Schemas['RunsListDocument']>(
          `/v1/runs?ticker=${knownTicker}`,
        );
        engine.savedRunId = runs.body.items[0]?.analysis_run_id ?? null;
      }
      await use(engine);
      await stopEngine(started.child);
    },
    { scope: 'worker', timeout: 300_000 },
  ],
});

// Opens the application against this worker's engine.
export async function openApp(page: Page, engine: RealEngine): Promise<void> {
  await page.goto(`/#engine=${engine.origin}&token=${engine.token}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export { expect };
