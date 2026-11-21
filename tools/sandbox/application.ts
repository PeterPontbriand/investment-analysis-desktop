// Starts the application against the throwaway database.
import { spawn } from 'node:child_process';

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
