import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export function listMarkdownFiles(repoRoot: string): string[] {
  try {
    const output = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    return [
      ...new Set(
        output
          .split(/\r?\n/)
          .filter((file) => file.toLowerCase().endsWith('.md')),
      ),
    ]
      .map((file) => resolve(repoRoot, file))
      .filter((file) => {
        try {
          return statSync(file).isFile();
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    const found: string[] = [];
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name === 'node_modules') continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
          found.push(path);
      }
    };
    visit(resolve(repoRoot));
    return found.sort((a, b) =>
      relative(repoRoot, a).localeCompare(relative(repoRoot, b)),
    );
  }
}
