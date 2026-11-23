import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// A change is docs-only when it changes at least one path and every changed
// path is a Markdown file anywhere or lies under docs/. Anything else takes the
// full gate. vendor/ always takes the full gate: tests read vendor/ian/SOURCE.md.
export function isDocsOnly(paths: readonly string[]): boolean {
  return (
    paths.length > 0 &&
    paths.every(
      (path) =>
        !path.startsWith('vendor/') &&
        (path.endsWith('.md') || path.startsWith('docs/')),
    )
  );
}

// Splits `git diff --name-only -z` output into paths.
export function parsePaths(input: string): string[] {
  return input.split('\0').filter((path) => path !== '');
}

// Reads NUL-separated paths from standard input and prints the job output line.
function main(): void {
  const paths = parsePaths(readFileSync(0, 'utf8'));
  process.stdout.write(`docs_only=${isDocsOnly(paths)}\n`);
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url
)
  main();
