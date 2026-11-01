import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function withMarkdownFixture(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'gui1a-docs-'));
  try {
    mkdirSync(join(root, 'docs'));
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export function writeMarkdown(root: string, path: string, text: string): void {
  const target = join(root, path);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, text, 'utf8');
}
