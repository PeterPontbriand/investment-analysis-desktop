// Fakes for the sandbox tool: no test runs IAN or Tauri.
import { join, resolve } from 'node:path';
import { readCommands, setupCommands } from '../../tools/sandbox/commands.ts';
import { ianFileName } from '../../tools/engine/source.ts';
import type { Dependencies } from '../../tools/sandbox/setup.ts';
import type {
  FileSystem,
  RunOptions,
  RunResult,
  Runner,
} from '../../tools/engine/types.ts';

export const vendoredCommit = 'beb58a23bf9b72b763ce2b260c1dcaaa6d0a884b';
export const repositoryRoot = resolve('fake-repository');
export const enginePath = resolve('fake-engine');
// The fixtures use the host's platform, so the paths they build with node:path
// match what the tool builds for that platform on every runner. Behaviour that
// depends on a fixed platform is tested with literal paths instead.
export const platform = process.platform;
export const ianPath = resolve('fake-bin', ianFileName(platform));
export const uvBinFolder = resolve('fake-uv-bin');
export const uvIanPath = join(uvBinFolder, ianFileName(platform));

// What `ian about --json` answers for a source checkout.
export function aboutJson(overrides: Record<string, unknown> = {}) {
  return json({
    schema_version: 1,
    engine_version: '0.1.0',
    installation_folder: enginePath,
    commit: vendoredCommit,
    uncommitted_changes: false,
    ...overrides,
  });
}

export const sourceRecord = `# Vendored IAN API description\n\n- **Commit:** \`${vendoredCommit}\`\n- **Commit date:** 2026-11-13\n`;

export type Call = {
  file: string;
  args: string[];
  options: RunOptions | undefined;
};

export type Script = (call: Call) => RunResult | undefined;

const ok = (stdout = '', code = 0): RunResult => ({
  code,
  stdout,
  stderr: '',
});

export function json(value: unknown, code = 0): RunResult {
  return ok(JSON.stringify(value), code);
}

// The answers of a healthy engine and a clean setup.
export function healthy(overrides: Script = () => undefined): Script {
  return (call) => {
    const override = overrides(call);
    if (override) return override;
    const line = call.args.join(' ');
    if (call.file === 'git') return ok();
    // uv's command folder holds no ian unless a test says so.
    if (call.file === 'uv') return ok('', 1);
    if (line === 'about --json') return aboutJson();
    if (line === 'db status')
      return ok(
        'State: ready\nDatabase: .../sandbox.sqlite3\nRevision: 0006\n',
      );
    if (line === readCommands.refreshes.join(' '))
      return json({
        items: [{ run_count: 5, outcome_counts: { completed: 3, failed: 1 } }],
        has_more: false,
      });
    if (line === readCommands.runs.join(' '))
      return json({
        items: [1, 2, 3, 4, 5, 6].map((n) => ({ n })),
        has_more: false,
      });
    if (line === readCommands.watchlists.join(' '))
      return json({
        items: [
          { display_name: 'Sandbox', entry_count: 5 },
          { display_name: 'Sandbox Empty', entry_count: 0 },
          { display_name: 'Sandbox Scratch', entry_count: 6 },
        ],
      });
    return ok(`ran: ian ${line}\n`);
  };
}

export function fakeRunner(script: Script): { run: Runner; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    run: (file, args, options) => {
      const call = { file, args, options };
      calls.push(call);
      return Promise.resolve(script(call) ?? ok());
    },
  };
}

export function fakeFileSystem(extra: Record<string, string> = {}): {
  fs: FileSystem;
  folders: string[];
  written: Record<string, string>;
} {
  const written: Record<string, string> = {};
  const folders: string[] = [];
  const files: Record<string, string> = {
    [join(repositoryRoot, 'vendor', 'ian', 'SOURCE.md')]: sourceRecord,
    ...extra,
  };
  const normal = (path: string) =>
    path.split(String.fromCharCode(92)).join('/');
  const present = new Set(
    [enginePath, repositoryRoot, ianPath, ...Object.keys(files)].map(normal),
  );
  return {
    folders,
    written,
    fs: {
      exists: (path) => present.has(normal(path)),
      readText: (path) => {
        const text = written[path] ?? files[path];
        if (text === undefined) throw new Error(`No fake file ${path}`);
        return text;
      },
      makeFolder: (path) => {
        folders.push(path);
        present.add(normal(path));
      },
      writeText: (path, text) => {
        written[path] = text;
        present.add(normal(path));
      },
    },
  };
}

export function dependencies(
  script: Script,
  fsExtra: Record<string, string> = {},
  overrides: Partial<Dependencies> = {},
) {
  const runner = fakeRunner(script);
  const progress: string[] = [];
  const files = fakeFileSystem(fsExtra);
  const deps: Dependencies = {
    run: runner.run,
    runToCompletion: runner.run,
    fs: files.fs,
    env: { PATH: resolve('fake-bin'), SECRET_FOR_TEST: 'kept' },
    platform,
    repositoryRoot,
    now: new Date(2026, 10, 13, 9, 5, 7),
    progress: (line) => progress.push(line),
    ...overrides,
  };
  return {
    deps,
    ...runner,
    folders: files.folders,
    written: files.written,
    progress,
  };
}

export const commandCount = setupCommands.length;
