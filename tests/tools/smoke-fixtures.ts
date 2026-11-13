// Fakes for the smoke-test tool: no test runs IAN or Tauri.
import { join, resolve } from 'node:path';
import { readCommands, setupCommands } from '../../tools/smoke/commands.ts';
import type { Dependencies } from '../../tools/smoke/setup.ts';
import type {
  FileSystem,
  RunOptions,
  RunResult,
  Runner,
} from '../../tools/smoke/types.ts';

export const vendoredCommit = 'beb58a23bf9b72b763ce2b260c1dcaaa6d0a884b';
export const repositoryRoot = resolve('fake-repository');
export const enginePath = resolve('fake-engine');
export const ianPath = resolve('fake-bin', 'ian.exe');

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
    if (call.file === 'git') return ok(`${vendoredCommit}\n`);
    if (line === '--help') return ok('Usage: root [OPTIONS] COMMAND\n');
    if (line === readCommands.databaseStatus.join(' '))
      return json({ state: 'ready', database_path: 'C:/private/real.sqlite3' });
    if (line === 'db status')
      return ok(
        'State: ready\nDatabase: .../smoke-test.sqlite3\nRevision: 0006\n',
      );
    if (line === readCommands.refreshes.join(' '))
      return json({
        items: [{ run_count: 4, outcome_counts: { completed: 3, failed: 1 } }],
        has_more: false,
      });
    if (line === readCommands.runs.join(' '))
      return json({
        items: [1, 2, 3, 4, 5].map((n) => ({ n })),
        has_more: false,
      });
    if (line === readCommands.watchlists.join(' '))
      return json({
        items: [
          { display_name: 'Smoke Test', entry_count: 4 },
          { display_name: 'Smoke Test Empty', entry_count: 0 },
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
} {
  const folders: string[] = [];
  const files: Record<string, string> = {
    [join(repositoryRoot, 'vendor', 'ian', 'SOURCE.md')]: sourceRecord,
    [join(enginePath, 'pyproject.toml')]:
      '[build-system]\nrequires = []\n\n[project]\nname = "ian"\nversion = "0.1.0"\n',
    ...extra,
  };
  const normal = (path: string) =>
    path.split(String.fromCharCode(92)).join('/');
  const present = new Set(
    [enginePath, ianPath, ...Object.keys(files)].map(normal),
  );
  return {
    folders,
    fs: {
      exists: (path) => present.has(normal(path)),
      readText: (path) => {
        const text = files[path];
        if (text === undefined) throw new Error(`No fake file ${path}`);
        return text;
      },
      makeFolder: (path) => {
        folders.push(path);
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
    fs: files.fs,
    env: { PATH: resolve('fake-bin'), SECRET_FOR_TEST: 'kept' },
    platform: 'win32',
    repositoryRoot,
    enginePath,
    now: new Date(2026, 10, 13, 9, 5, 7),
    progress: (line) => progress.push(line),
    ...overrides,
  };
  return { deps, ...runner, folders: files.folders, progress };
}

export const commandCount = setupCommands.length;
