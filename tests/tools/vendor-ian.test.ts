import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatSummary, summarize } from '../../tools/vendor-ian/summary.ts';
import {
  VendorStop,
  vendorIan,
  type VendorDependencies,
} from '../../tools/vendor-ian/vendor.ts';
import {
  dependencies,
  enginePath,
  healthy,
  repositoryRoot,
  sourceRecord,
  vendoredCommit,
  type Call,
  type Script,
} from './sandbox-fixtures.ts';

const newCommit = 'c'.repeat(40);
const oldApi = {
  paths: {
    '/v1/a': { get: { summary: 'a' } },
    '/v1/b': { get: { summary: 'b', tags: ['x', 'y'] } },
    '/v1/gone': { delete: {} },
  },
  components: {
    schemas: { A: { type: 'string' }, B: { type: 'integer' }, Gone: {} },
  },
};
const newApi = {
  paths: {
    '/v1/a': { get: { summary: 'a' } },
    // The same operation with its keys in another order is not a change.
    '/v1/b': { get: { tags: ['x', 'y'], summary: 'b2' } },
    '/v1/new': { post: {}, get: {} },
  },
  components: {
    schemas: { A: { type: 'string' }, B: { type: 'number' }, C: {} },
  },
};
const oldText = `${JSON.stringify(oldApi, null, 2)}\n`;
const newText = `${JSON.stringify(newApi, null, 2)}\n`;
const files = {
  [join(repositoryRoot, 'vendor', 'ian', 'openapi.json')]: oldText,
};

// The answers of a healthy engine checkout and a clean repository.
function git(overrides: Script = () => undefined): Script {
  return healthy((call) => {
    const override = overrides(call);
    if (override) return override;
    if (call.file !== 'git') return undefined;
    const [, target, ...rest] = call.args;
    const line = rest.join(' ');
    const ok = (stdout = '', code = 0) => ({ code, stdout, stderr: '' });
    if (target === repositoryRoot) return ok();
    if (line === 'fetch origin') return ok();
    if (line.startsWith('rev-parse ')) return ok(`${newCommit}\n`);
    if (line.startsWith('merge-base --is-ancestor')) return ok();
    if (line === `show ${newCommit}:schemas/openapi.json`) return ok(newText);
    if (line === `show -s --format=%cs ${newCommit}`) return ok('2026-11-15\n');
    if (line.startsWith('log --oneline'))
      return ok('2890cfb docs: change the API\n');
    return undefined;
  });
}

function setup(script: Script = () => undefined) {
  const made = dependencies(git(script), files);
  const output: string[] = [];
  const deps: VendorDependencies = {
    run: made.deps.run,
    fs: made.deps.fs,
    env: made.deps.env,
    platform: made.deps.platform,
    repositoryRoot,
    generate: () => 'generated types\n',
    print: (line) => output.push(line),
  };
  return { deps, output, calls: made.calls, written: made.written };
}

async function stopMessage(
  script: Script,
  revision = 'main',
): Promise<{ message: string; calls: Call[]; written: object }> {
  const { deps, calls, written } = setup(script);
  const error = await vendorIan(deps, revision).then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(VendorStop);
  return { message: (error as VendorStop).message, calls, written };
}

describe('summary of an API description change', () => {
  it('lists operations and component schemas added, removed and changed', () => {
    expect(formatSummary(summarize(oldApi, newApi))).toEqual([
      'Operations added (2):',
      '  GET /v1/new',
      '  POST /v1/new',
      'Operations removed (1):',
      '  DELETE /v1/gone',
      'Operations changed (1):',
      '  GET /v1/b',
      'Component schemas added (1):',
      '  C',
      'Component schemas removed (1):',
      '  Gone',
      'Component schemas changed (1):',
      '  B',
    ]);
  });

  it('says none for an unchanged description', () => {
    expect(formatSummary(summarize(oldApi, oldApi))).toEqual([
      'Operations added: none',
      'Operations removed: none',
      'Operations changed: none',
      'Component schemas added: none',
      'Component schemas removed: none',
      'Component schemas changed: none',
    ]);
  });
});

describe('pnpm vendor-ian', () => {
  it('writes the document, the types and the source record, and prints the summary', async () => {
    const { deps, output, calls, written } = setup();

    await vendorIan(deps, 'main');

    expect(written[join(repositoryRoot, 'vendor', 'ian', 'openapi.json')]).toBe(
      newText,
    );
    expect(written[join(repositoryRoot, 'src', 'api', 'schema.ts')]).toBe(
      'generated types\n',
    );
    expect(written[join(repositoryRoot, 'vendor', 'ian', 'SOURCE.md')]).toBe(
      sourceRecord
        .replace(vendoredCommit, newCommit)
        .replace('2026-11-13', '2026-11-15'),
    );
    expect(output.slice(0, 2)).toEqual([
      'Changes to the API description, beb58a2 to ccccccc:',
      'Operations added (2):',
    ]);
    expect(output).toContain('  2890cfb docs: change the API');
    // The engine's checkout is found through ian about, fetched, and read with
    // git show; nothing is checked out in it.
    const engineCalls = calls
      .filter((call) => call.file === 'git' && call.args[1] === enginePath)
      .map((call) => call.args.slice(2)[0]);
    expect(engineCalls).toEqual([
      'fetch',
      'rev-parse',
      'merge-base',
      'show',
      'show',
      'log',
    ]);
    expect(
      calls.some((call) => call.file === 'git' && call.args.includes('switch')),
    ).toBe(false);
  });

  it('refuses a commit that is not on origin/main, and writes nothing', async () => {
    const { message, written } = await stopMessage((call) =>
      call.file === 'git' && call.args.includes('--is-ancestor')
        ? { code: 1, stdout: '', stderr: '' }
        : undefined,
    );
    expect(message).toBe(
      `Commit ${newCommit} is not on origin/main of the engine checkout. Vendor only merged engine commits.`,
    );
    expect(written).toEqual({});
  });

  it('refuses when vendor/ian/ or src/api/schema.ts has uncommitted changes', async () => {
    const { message, calls, written } = await stopMessage((call) =>
      call.file === 'git' && call.args.includes('status')
        ? { code: 0, stdout: ' M vendor/ian/openapi.json\n', stderr: '' }
        : undefined,
    );
    expect(message).toMatch(/uncommitted changes/);
    expect(calls.some((call) => call.args.includes('show'))).toBe(false);
    expect(written).toEqual({});
  });

  it('refuses a name the engine checkout cannot resolve', async () => {
    const { message } = await stopMessage((call) =>
      call.file === 'git' && call.args.includes('rev-parse')
        ? { code: 128, stdout: '', stderr: 'unknown revision' }
        : undefined,
    );
    expect(message).toBe(
      'main is not a commit in the engine checkout, even after fetching.',
    );
  });

  it('refuses an argument that looks like a Git option', async () => {
    const { message, calls } = await stopMessage(() => undefined, '--all');
    expect(message).toMatch(/^Usage: pnpm vendor-ian <commit>/);
    expect(calls).toEqual([]);
  });

  it('puts back the old document when generating the types fails', async () => {
    const { deps, written } = setup();
    deps.generate = () => null;
    const error = await vendorIan(deps, 'main').then(
      () => null,
      (caught: unknown) => caught,
    );
    expect((error as VendorStop).message).toMatch(/openapi-typescript failed/);
    expect(written[join(repositoryRoot, 'vendor', 'ian', 'openapi.json')]).toBe(
      oldText,
    );
    expect(written[join(repositoryRoot, 'src', 'api', 'schema.ts')]).toBe(
      undefined,
    );
  });

  it('changes nothing when the commit is already vendored', async () => {
    const { deps, output, written } = setup((call) =>
      call.file === 'git' && call.args.includes('rev-parse')
        ? { code: 0, stdout: `${vendoredCommit}\n`, stderr: '' }
        : call.file === 'git' &&
            call.args.includes('show') &&
            call.args.some((a) => a.endsWith(':schemas/openapi.json'))
          ? { code: 0, stdout: oldText, stderr: '' }
          : undefined,
    );
    await vendorIan(deps, vendoredCommit);
    expect(output).toEqual(['Already vendored: beb58a2. Nothing changed.']);
    expect(written).toEqual({});
  });
});
