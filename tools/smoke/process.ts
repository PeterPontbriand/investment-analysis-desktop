// Real process and file access for the smoke-test tool, spawning the way
// tools/gate.ts does: no shell, and pnpm through npm_execpath.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { FileSystem, RunOptions, RunResult, Runner } from './types.ts';

// Ends a command and anything it started. On Windows `taskkill /T` takes the
// whole tree (the `ian` launcher starts the engine through uv); elsewhere the
// child gets SIGTERM.
function stopChild(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === 'win32')
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      shell: false,
      stdio: 'ignore',
    }).on('error', () => child.kill());
  else child.kill('SIGTERM');
}

export const run: Runner = (file, args, options: RunOptions = {}) =>
  new Promise<RunResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: options.env as NodeJS.ProcessEnv | undefined,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', (error: Error) =>
      resolve({ code: null, stdout, stderr: `${stderr}${error.message}\n` }),
    );
    const stop = () => stopChild(child);
    if (options.signal?.aborted) stop();
    else options.signal?.addEventListener('abort', stop, { once: true });
    child.on('close', (code) => {
      options.signal?.removeEventListener('abort', stop);
      resolve({ code, stdout, stderr });
    });
  });

export const fileSystem: FileSystem = {
  exists: (path) => existsSync(path),
  readText: (path) => readFileSync(path, 'utf8'),
  makeFolder: (path) => {
    mkdirSync(path, { recursive: true });
  },
  writeText: (path, text) => {
    writeFileSync(path, text, 'utf8');
  },
};

// Starts `pnpm tauri dev` with the given environment, inheriting standard
// input and output, and returns its exit code. Ctrl+C reaches the application,
// so the tool ignores it while the application runs.
export function startApplication(
  cwd: string,
  env: Record<string, string | undefined>,
): Promise<number> {
  const execPath = process.env.npm_execpath;
  const program =
    execPath && /\.(js|cjs|mjs)$/.test(execPath)
      ? { file: process.execPath, args: [execPath, 'tauri', 'dev'] }
      : { file: execPath ?? 'pnpm', args: ['tauri', 'dev'] };
  return new Promise<number>((resolve) => {
    const ignore = () => {};
    process.on('SIGINT', ignore);
    const child = spawn(program.file, program.args, {
      cwd,
      env: env as NodeJS.ProcessEnv,
      shell: false,
      stdio: 'inherit',
    });
    child.on('error', (error: Error) => {
      process.stderr.write(`${error.message}\n`);
      resolve(1);
    });
    child.on('close', (code) => {
      process.off('SIGINT', ignore);
      resolve(code ?? 1);
    });
  });
}
