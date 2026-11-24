import { execFileSync } from 'node:child_process';

// Directory prefixes whose changes require the Rust and Tauri steps.
export const SHELL_PATH_PREFIXES: readonly string[] = [
  'src-tauri/',
  'src/platform/',
  'tests/shell/',
];

// Exact files whose changes require the Rust and Tauri steps.
export const SHELL_PATH_FILES: readonly string[] = [
  'wdio.conf.js',
  'rust-toolchain.toml',
  'pnpm-lock.yaml',
];

// Returns the input paths that match a shell path, in input order, without duplicates.
export function shellPathsChanged(paths: readonly string[]): string[] {
  const matched: string[] = [];
  for (const path of paths) {
    const isShell =
      SHELL_PATH_FILES.includes(path) ||
      SHELL_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (isShell && !matched.includes(path)) matched.push(path);
  }
  return matched;
}

function git(args: string[]): string[] {
  const out = execFileSync('git', args, { encoding: 'utf8' });
  return out.split(/\r?\n/).filter((line) => line !== '');
}

// Lists paths changed against the merge base with origin/main, plus untracked files, or the first git error.
export function listChangedPaths(): { paths: string[] } | { error: string } {
  try {
    const base = git(['merge-base', 'HEAD', 'origin/main'])[0];
    if (base === undefined) return { error: 'no merge base with origin/main' };
    const tracked = git(['diff', '--name-only', base]);
    const untracked = git(['ls-files', '--others', '--exclude-standard']);
    return { paths: [...new Set([...tracked, ...untracked])] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export type GateMode = 'full' | 'slice' | 'web' | 'shell';

// Which kinds of step a mode runs: the dependency install, the web steps (everything
// that is not a shell step), and the Rust and Tauri shell steps.
export type StepSelection = { install: boolean; web: boolean; shell: boolean };

export function selectSteps(
  mode: GateMode,
  shellChanged: boolean,
): StepSelection {
  switch (mode) {
    case 'full':
      return { install: true, web: true, shell: true };
    case 'slice':
      return { install: true, web: true, shell: shellChanged };
    case 'web':
      return { install: true, web: true, shell: false };
    case 'shell':
      return { install: true, web: false, shell: true };
  }
}
