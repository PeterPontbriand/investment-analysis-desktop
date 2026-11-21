// Real process and file access for the tools that run `ian`, spawning the way
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
