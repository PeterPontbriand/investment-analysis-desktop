// Generates the API types from a copy of IAN's OpenAPI description. The drift
// check and `pnpm vendor-ian` both call this, so they generate the same text.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = join('node_modules', 'openapi-typescript', 'bin', 'cli.js');

// The generated TypeScript for the OpenAPI file at `source`, with Unix line
// endings, or null when openapi-typescript fails.
export function generateTypes(source: string): string | null {
  const directory = mkdtempSync(join(tmpdir(), 'iad-openapi-'));
  try {
    const output = join(directory, 'schema.ts');
    const result = spawnSync(process.execPath, [cli, source, '-o', output], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    if (result.status !== 0) return null;
    return readFileSync(output, 'utf8').replace(/\r\n/g, '\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
