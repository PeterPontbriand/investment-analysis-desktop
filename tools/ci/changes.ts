import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { shellPathsChanged } from '../gate-scope.ts';

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

// Builds the job output lines. An empty path list is an unknown range, which takes
// the full path: not docs-only, and shell steps needed.
export function classify(paths: readonly string[]): string {
  const shell = paths.length === 0 || shellPathsChanged(paths).length > 0;
  return `docs_only=${isDocsOnly(paths)}\nshell=${shell}\n`;
}

// Reads NUL-separated paths from standard input and prints the job output lines.
function main(): void {
  const paths = parsePaths(readFileSync(0, 'utf8'));
  process.stdout.write(classify(paths));
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url
)
  main();
