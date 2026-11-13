// Reads from the vendored source record and the engine checkout.

// The IAN commit in vendor/ian/SOURCE.md.
export function readVendoredCommit(sourceRecord: string): string {
  const match = /\*\*Commit:\*\*\s*`([0-9a-f]{40})`/.exec(sourceRecord);
  if (!match) throw new Error('vendor/ian/SOURCE.md names no commit.');
  return match[1]!;
}

// The engine version in the checkout's pyproject.toml: the first `version`
// line of its [project] table.
export function readEngineVersion(pyproject: string): string | null {
  const table = /^\[project\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(pyproject);
  const match = /^version\s*=\s*"([^"]+)"/m.exec(table?.[1] ?? '');
  return match ? match[1]! : null;
}

// Where `ian` resolves from: IAD_IAN_PATH when it is set and not empty, as the
// application chooses, otherwise the first match on PATH.
export function resolveIan(
  env: Record<string, string | undefined>,
  platform: string,
  exists: (path: string) => boolean,
): string | null {
  const configured = env.IAD_IAN_PATH;
  if (configured !== undefined && configured !== '') return configured;
  const windows = platform === 'win32';
  const names = windows ? ['ian.exe'] : ['ian'];
  const separator = windows ? ';' : ':';
  const joiner = windows ? '\\' : '/';
  for (const folder of (env.PATH ?? env.Path ?? '').split(separator)) {
    if (folder === '') continue;
    for (const name of names) {
      const candidate = `${folder.replace(/[\\/]+$/, '')}${joiner}${name}`;
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}
