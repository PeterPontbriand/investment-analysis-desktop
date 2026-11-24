// Claude Code Stop hook: run the slice check when an agent ends a turn with unchecked changes.
//
// Claude Code runs this script when the implementer finishes responding and passes a JSON
// event on standard input. The script checks only when files changed since its last passing
// run: it runs the documentation checks for a documentation-only change and the slice check
// otherwise. A failure is written to standard error and the script exits with status 2, which
// makes Claude Code send it back to the agent. The script never loops: it exits at once when
// `stop_hook_active` is set. Standard library only.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDocsOnly } from './ci/changes.ts';
import { listChangedPaths } from './gate-scope.ts';

export const STATE_FOLDER = join('.tmp', 'agent-stop-hook');
export const LAST_PASS_FILE = join(STATE_FOLDER, 'last-pass');
export const FAILURE_TAIL_LINES = 40;
export const EXIT_PASSED = 0;
export const EXIT_SEND_BACK = 2;

// A check is the arguments that follow `pnpm`.
export type Check = readonly string[];

// Returns whether the checks must run for this Stop event. `paths` is null when the changed
// paths could not be listed, which takes the checks; an empty list takes none.
export function shouldCheck(
  event: Readonly<Record<string, unknown>>,
  paths: readonly string[] | null,
  currentFingerprint: string,
  lastPass: string | null,
): boolean {
  if (event.stop_hook_active === true) return false;
  if (paths !== null && paths.length === 0) return false;
  return currentFingerprint !== lastPass;
}

// Returns the SHA-256 digest over HEAD, the diff against HEAD and each untracked file's path
// and bytes, in path order.
export function fingerprint(
  head: string,
  diff: Uint8Array,
  untracked: Readonly<Record<string, Uint8Array>>,
): string {
  const digest = createHash('sha256');
  digest.update(head);
  digest.update('\0');
  digest.update(diff);
  for (const path of Object.keys(untracked).sort()) {
    digest.update('\0');
    digest.update(path);
    digest.update('\0');
    digest.update(untracked[path] as Uint8Array);
  }
  return digest.digest('hex');
}

// Chooses the pnpm checks for the changed paths: the documentation checks for a
// documentation-only change, the slice check otherwise and when the paths are unknown.
export function chooseChecks(paths: readonly string[] | null): Check[] {
  if (paths !== null && isDocsOnly(paths))
    return [['docs:check'], ['format:check']];
  return [['gate:slice']];
}

// Returns the message sent back to the agent for a failed check, given its complete output
// and, when the slice check ran, the path of its complete output file.
export function summarizeFailure(
  output: string,
  gateOutputPath?: string,
): string {
  const failed: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length >= 4 && cells[0] === '' && cells[2] === 'FAIL')
      failed.push(cells[1] as string);
  }
  const report =
    failed.length > 0
      ? [`Failing steps: ${failed.join(', ')}`]
      : [
          `Last ${FAILURE_TAIL_LINES} lines of output:`,
          ...output.trimEnd().split(/\r?\n/).slice(-FAILURE_TAIL_LINES),
        ];
  if (gateOutputPath !== undefined)
    report.push(`Complete output: ${gateOutputPath}`);
  return report.join('\n');
}

function run(
  file: string,
  args: readonly string[],
  cwd: string,
): { status: number; stdout: Buffer; stderr: Buffer } {
  const result = spawnSync(file, [...args], {
    cwd,
    shell: file === 'pnpm' && process.platform === 'win32',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function git(root: string, ...args: string[]): Buffer {
  const result = run('git', args, root);
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed`);
  return result.stdout;
}

function untrackedPaths(root: string): string[] {
  return git(root, 'ls-files', '--others', '--exclude-standard')
    .toString('utf8')
    .split(/\r?\n/)
    .filter((path) => path !== '');
}

function currentFingerprint(root: string): string {
  const head = git(root, 'rev-parse', 'HEAD').toString('utf8').trim();
  const diff = git(root, 'diff', 'HEAD', '--binary');
  const untracked: Record<string, Uint8Array> = {};
  for (const path of untrackedPaths(root)) {
    try {
      untracked[path] = readFileSync(join(root, path));
    } catch {
      // A path that cannot be read as a file (a directory, a removed file) adds nothing.
    }
  }
  return fingerprint(head, diff, untracked);
}

function readLastPass(root: string): string | null {
  const stored = join(root, LAST_PASS_FILE);
  if (!existsSync(stored)) return null;
  return readFileSync(stored, 'utf8').trim() || null;
}

function writeLastPass(root: string, value: string): void {
  mkdirSync(join(root, STATE_FOLDER), { recursive: true });
  writeFileSync(join(root, LAST_PASS_FILE), `${value}\n`, 'utf8');
}

function readEvent(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(0, 'utf8') || '{}');
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

// Runs the checks in order and returns whether all passed, with their combined output.
function runChecks(
  root: string,
  checks: readonly Check[],
): { passed: boolean; output: string } {
  let output = '';
  for (const check of checks) {
    const result = run('pnpm', check, root);
    output += `${result.stdout.toString('utf8')}\n${result.stderr.toString('utf8')}\n`;
    if (result.status !== 0) return { passed: false, output };
  }
  return { passed: true, output };
}

// Reads the Stop event, runs the checks when needed and returns the hook's exit status.
function main(): number {
  const event = readEvent();
  if (event.stop_hook_active === true) return EXIT_PASSED;
  const root = git(process.cwd(), 'rev-parse', '--show-toplevel')
    .toString('utf8')
    .trim();
  process.chdir(root);
  const listed = listChangedPaths();
  const paths = 'paths' in listed ? listed.paths : null;
  const now = currentFingerprint(root);
  if (!shouldCheck(event, paths, now, readLastPass(root))) return EXIT_PASSED;
  const checks = chooseChecks(paths);
  const { passed, output } = runChecks(root, checks);
  if (passed) {
    writeLastPass(root, now);
    return EXIT_PASSED;
  }
  const ranGate = checks.some((check) => check[0] === 'gate:slice');
  process.stderr.write(
    `${summarizeFailure(output, ranGate ? join(root, 'gate-output.txt') : undefined)}\n`,
  );
  return EXIT_SEND_BACK;
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url
)
  process.exitCode = main();
