import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Test-only locales must never reach the production build. The markers are the
// tags of the catalogs under tests/fixtures/locales/.
const testLocaleDirectory = 'tests/fixtures/locales';
const buildDirectory = 'dist';

const tags = readdirSync(testLocaleDirectory)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length));

function* files(root: string): Generator<string> {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

if (tags.length === 0) {
  process.stderr.write(
    `No test locale files in ${testLocaleDirectory}/, so this check would check nothing.\n`,
  );
  process.exitCode = 1;
} else {
  const found: string[] = [];
  for (const path of files(buildDirectory)) {
    const text = readFileSync(path, 'utf8');
    for (const tag of tags)
      if (text.includes(tag)) found.push(`  ${path}: ${tag}\n`);
  }
  if (found.length > 0) {
    process.stderr.write(
      `Test locale tag found in the production build:\n${found.join('')}`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `No test locale (${tags.join(', ')}) in ${buildDirectory}/.\n`,
    );
  }
}
