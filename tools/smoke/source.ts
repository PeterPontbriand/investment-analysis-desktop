// Reads from the vendored source record and the engine checkout.
import type { Runner } from './types.ts';

// The IAN commit in vendor/ian/SOURCE.md.
export function readVendoredCommit(sourceRecord: string): string {
  const match = /\*\*Commit:\*\*\s*`([0-9a-f]{40})`/.exec(sourceRecord);
  if (!match) throw new Error('vendor/ian/SOURCE.md names no commit.');
  return match[1]!;
}

// The engine version in the checkout's pyproject.toml: the first `version`
// line of its [project] table.
export function readEngineVersion(pyproject: string): string | null {
  return readProjectValue(pyproject, 'version');
}

// The name in the [project] table of a pyproject.toml.
export function readProjectName(pyproject: string): string | null {
  return readProjectValue(pyproject, 'name');
}

function readProjectValue(pyproject: string, key: string): string | null {
  const table = /^\[project\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(pyproject);
  const match = new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm').exec(
    table?.[1] ?? '',
  );
  return match ? match[1]! : null;
}

// Where `ian` came from, in the order the tool looks.
export type IanSource = 'IAD_IAN_PATH' | 'PATH' | 'uv';
export type IanLocation = { path: string; source: IanSource };

// How the record names each source.
export const ianSourceNames: Record<IanSource, string> = {
  IAD_IAN_PATH: '`IAD_IAN_PATH`',
  PATH: '`PATH`',
  uv: "uv's command folder",
};

function ianFileName(platform: string): string {
  return platform === 'win32' ? 'ian.exe' : 'ian';
}

// `ian` from IAD_IAN_PATH when it is set and not empty, as the application
// chooses, otherwise the first match on PATH.
export function resolveIan(
  env: Record<string, string | undefined>,
  platform: string,
  exists: (path: string) => boolean,
): IanLocation | null {
  const configured = env.IAD_IAN_PATH;
  if (configured !== undefined && configured !== '')
    return { path: configured, source: 'IAD_IAN_PATH' };
  const windows = platform === 'win32';
  const separator = windows ? ';' : ':';
  const joiner = windows ? '\\' : '/';
  for (const folder of (env.PATH ?? env.Path ?? '').split(separator)) {
    if (folder === '') continue;
    const candidate = `${folder.replace(/[\\/]+$/, '')}${joiner}${ianFileName(platform)}`;
    if (exists(candidate)) return { path: candidate, source: 'PATH' };
  }
  return null;
}

// `ian` in uv's command folder, as `uv tool dir --bin` reports it: where the
// engine's installer puts the command. A missing uv, or a failed command, means
// `ian` is not found there.
export async function resolveIanInUv(
  run: Runner,
  env: Record<string, string | undefined>,
  platform: string,
  exists: (path: string) => boolean,
): Promise<IanLocation | null> {
  const result = await run('uv', ['tool', 'dir', '--bin'], { env });
  const folder = result.stdout.trim().split(/\r?\n/)[0]?.trim() ?? '';
  if (result.code !== 0 || folder === '') return null;
  const joiner = platform === 'win32' ? '\\' : '/';
  const candidate = `${folder.replace(/[\\/]+$/, '')}${joiner}${ianFileName(platform)}`;
  return exists(candidate) ? { path: candidate, source: 'uv' } : null;
}
