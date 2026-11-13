import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Regenerates src/api/schema.ts from the vendored OpenAPI document into a
// temporary file and fails when the checked-in types differ.
const cli = join('node_modules', 'openapi-typescript', 'bin', 'cli.js');
const vendored = join('vendor', 'ian', 'openapi.json');
const checkedIn = join('src', 'api', 'schema.ts');

const directory = mkdtempSync(join(tmpdir(), 'iad-openapi-'));
try {
  const regenerated = join(directory, 'schema.ts');
  const result = spawnSync(
    process.execPath,
    [cli, vendored, '-o', regenerated],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (result.status !== 0) {
    process.stderr.write('openapi-typescript failed.\n');
    process.exitCode = 1;
  } else {
    const normalize = (path: string) =>
      readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    if (normalize(regenerated) !== normalize(checkedIn)) {
      process.stderr.write(
        `${checkedIn} differs from the types generated from ${vendored}. Regenerate it with: pnpm exec openapi-typescript ${vendored} -o ${checkedIn}\n`,
      );
      process.exitCode = 1;
    } else {
      process.stdout.write(`${checkedIn} matches ${vendored}.\n`);
    }
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
