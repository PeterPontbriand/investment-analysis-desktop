import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Test-only locales must never reach the production build.
const marker = 'ar-XB';
const directory = 'dist';

function* files(root: string): Generator<string> {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

const offenders = [...files(directory)].filter((path) =>
  readFileSync(path, 'utf8').includes(marker),
);

if (offenders.length > 0) {
  process.stderr.write(
    `Test locale text "${marker}" found in the production build:\n${offenders.map((path) => `  ${path}\n`).join('')}`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`No test locale in ${directory}/.\n`);
}
