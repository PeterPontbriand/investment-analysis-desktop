// `pnpm vendor-ian <commit>`: replaces the vendored copy of IAN's OpenAPI
// description with the one at an engine commit, regenerates the API types, and
// says what changed.
import { join } from 'node:path';
import { locateEngine, type EngineEnvironment } from '../engine/engine.ts';
import { readVendoredCommit } from '../engine/source.ts';
import type { FileSystem, Runner } from '../engine/types.ts';
import { formatSummary, summarize } from './summary.ts';

export class VendorStop extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VendorStop';
  }
}

export type VendorDependencies = {
  run: Runner;
  fs: FileSystem;
  env: EngineEnvironment;
  platform: string;
  repositoryRoot: string;
  // The generated types for the OpenAPI file at a path, or null on failure.
  generate: (openapiPath: string) => string | null;
  print: (line: string) => void;
};

export const vendorMessages = {
  usage: () =>
    'Usage: pnpm vendor-ian <commit>\nGive the engine commit to vendor: a full or short hash, or a name the engine checkout can resolve.',
  fetchFailed: () =>
    'Could not fetch the engine checkout from its origin, which is needed to check that the commit is on origin/main.',
  notACommit: (revision: string) =>
    `${revision} is not a commit in the engine checkout, even after fetching.`,
  notOnMain: (commit: string) =>
    `Commit ${commit} is not on origin/main of the engine checkout. Vendor only merged engine commits.`,
  mainUnreadable: () =>
    'Could not tell whether the commit is on origin/main. The engine checkout needs an origin/main branch.',
  dirty: () =>
    'vendor/ian/ or src/api/schema.ts has uncommitted changes. Commit or discard them before re-vendoring, so the change is only the re-vendor.',
  noDocument: (commit: string) =>
    `Commit ${commit} has no schemas/openapi.json.`,
  noDate: (commit: string) => `Could not read the commit date of ${commit}.`,
  generationFailed: () =>
    'openapi-typescript failed, so nothing was changed. Its output is above.',
} as const;

const openapiPath = join('vendor', 'ian', 'openapi.json');
const sourcePath = join('vendor', 'ian', 'SOURCE.md');
const schemaPath = join('src', 'api', 'schema.ts');

export async function vendorIan(
  deps: VendorDependencies,
  revision: string,
): Promise<void> {
  const { run, fs, repositoryRoot, print } = deps;
  if (revision === '' || revision.startsWith('-'))
    throw new VendorStop(vendorMessages.usage());

  const { about } = await locateEngine(deps);
  const folder = about.installationFolder;
  const engine = (args: string[]) => run('git', ['-C', folder, ...args]);

  // Fetch first, so a commit merged since the last fetch can be resolved and
  // origin/main is current.
  const fetched = await engine(['fetch', 'origin']);
  if (fetched.code !== 0) throw new VendorStop(vendorMessages.fetchFailed());
  const resolved = await engine(['rev-parse', `${revision}^{commit}`]);
  const commit = resolved.stdout.trim().toLowerCase();
  if (resolved.code !== 0 || !/^[0-9a-f]{40}$/.test(commit))
    throw new VendorStop(vendorMessages.notACommit(revision));
  const ancestor = await engine([
    'merge-base',
    '--is-ancestor',
    commit,
    'origin/main',
  ]);
  if (ancestor.code === 1)
    throw new VendorStop(vendorMessages.notOnMain(commit));
  if (ancestor.code !== 0)
    throw new VendorStop(vendorMessages.mainUnreadable());

  const changes = await run('git', [
    '-C',
    repositoryRoot,
    'status',
    '--porcelain',
    '--',
    'vendor/ian',
    'src/api/schema.ts',
  ]);
  if (changes.code !== 0 || changes.stdout.trim() !== '')
    throw new VendorStop(vendorMessages.dirty());

  const shown = await engine(['show', `${commit}:schemas/openapi.json`]);
  if (shown.code !== 0) throw new VendorStop(vendorMessages.noDocument(commit));
  const oldDocument = fs.readText(join(repositoryRoot, openapiPath));
  const oldSource = fs.readText(join(repositoryRoot, sourcePath));
  const oldCommit = readVendoredCommit(oldSource);
  if (commit === oldCommit && shown.stdout === oldDocument) {
    print(`Already vendored: ${commit.slice(0, 7)}. Nothing changed.`);
    return;
  }

  const date = (
    await engine(['show', '-s', '--format=%cs', commit])
  ).stdout.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new VendorStop(vendorMessages.noDate(commit));

  print(
    `Changes to the API description, ${oldCommit.slice(0, 7)} to ${commit.slice(0, 7)}:`,
  );
  for (const line of formatSummary(
    summarize(
      JSON.parse(oldDocument) as Parameters<typeof summarize>[0],
      JSON.parse(shown.stdout) as Parameters<typeof summarize>[1],
    ),
  ))
    print(line);
  const log = await engine([
    'log',
    '--oneline',
    `${oldCommit}..${commit}`,
    '--',
    'schemas/openapi.json',
  ]);
  print('Engine commits that changed schemas/openapi.json:');
  if (log.code !== 0)
    print(
      `  (not available: the engine checkout has no history from ${oldCommit.slice(0, 7)} to ${commit.slice(0, 7)})`,
    );
  else if (log.stdout.trim() === '') print('  none');
  else for (const line of log.stdout.trim().split(/\r?\n/)) print(`  ${line}`);

  fs.writeText(join(repositoryRoot, openapiPath), shown.stdout);
  const types = deps.generate(join(repositoryRoot, openapiPath));
  if (types === null) {
    fs.writeText(join(repositoryRoot, openapiPath), oldDocument);
    throw new VendorStop(vendorMessages.generationFailed());
  }
  fs.writeText(join(repositoryRoot, schemaPath), types);
  fs.writeText(
    join(repositoryRoot, sourcePath),
    oldSource
      .replace(/(\*\*Commit:\*\*\s*)`[0-9a-f]{40}`/, `$1\`${commit}\``)
      .replace(/(\*\*Commit date:\*\*\s*)\S+/, `$1${date}`),
  );
  print(
    `Wrote ${openapiPath}, ${schemaPath} and ${sourcePath}. Record a decision naming commit ${commit.slice(0, 7)}, as AGENTS.md says, and run pnpm gate.`,
  );
}
