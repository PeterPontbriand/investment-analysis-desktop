import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { listMarkdownFiles } from './markdown-files.ts';

const headingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const fencePattern = /^(```+|~~~+)/;
const linkPattern = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;
const inlineCodePattern =
  /(?<!`)(?<ticks>`+)(?!`).*?(?<!`)(?=\k<ticks>)(?<closing>`+)(?!`)/g;
const markdownLinkTextPattern = /\[([^\]]*)\]\([^)]*\)/g;
const slugPunctuation =
  /[!"#$%&'()*+,./:;<=>?@[\]\\^{}|~\u2000-\u206f\u2e00-\u2e7f]/g;

export type Issue = { path: string; line: number; reason: string };

export function nonFencedLines(
  lines: string[],
): Array<{ line: number; text: string }> {
  const result: Array<{ line: number; text: string }> = [];
  let marker = '';
  for (const [index, text] of lines.entries()) {
    const trimmed = text.trim();
    const match = fencePattern.exec(trimmed);
    if (match) {
      if (!marker) marker = match[1]![0]!.repeat(3);
      else if (trimmed.startsWith(marker)) marker = '';
      continue;
    }
    if (!marker)
      result.push({ line: index + 1, text: text.replace(/\r?\n$/, '') });
  }
  return result;
}

export function headingSlugs(lines: string[]): Set<string> {
  const slugs = new Set<string>();
  const counts = new Map<string, number>();
  for (const { text } of nonFencedLines(lines)) {
    const match = headingPattern.exec(text);
    if (!match) continue;
    const heading = match[2]!
      .replace(markdownLinkTextPattern, '$1')
      .replace(/\*\*|__|`/g, '')
      .trim()
      .toLowerCase();
    const base = heading.replace(slugPunctuation, '').replace(/\s/g, '-');
    if (!base) continue;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }
  return slugs;
}

function external(target: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith('//');
}

function relativeLabel(path: string, root: string): string {
  const label = path.slice(root.length).replace(/^[/\\]/, '');
  return label.replaceAll('\\', '/');
}

export function checkMarkdownLinks(repoRoot: string): Issue[] {
  const files = listMarkdownFiles(resolve(repoRoot));
  const slugs = new Map<string, Set<string>>();
  const issues: Issue[] = [];
  for (const source of files) {
    const text = readFileSync(source, 'utf8');
    const lines = text.split(/(?<=\n)/);
    const headings = headingSlugs(lines);
    slugs.set(source, headings);
    const markdownOnlyLines = nonFencedLines(lines);
    for (const entry of markdownOnlyLines) {
      const searchable = entry.text.replace(inlineCodePattern, ' ');
      for (const match of searchable.matchAll(linkPattern)) {
        const label = match[1]!;
        const target = match[2]!.trim();
        if (!target || external(target)) continue;
        const [pathPart, ...anchorParts] = target.split('#');
        const anchor = anchorParts.join('#');
        const targetPath = pathPart
          ? resolve(dirname(source), pathPart)
          : source;
        let isDirectory: boolean;
        try {
          const stats = statSync(targetPath);
          isDirectory = stats.isDirectory();
        } catch {
          issues.push({
            path: relativeLabel(source, repoRoot),
            line: entry.line,
            reason: `[${label}](${target}) -- target path does not exist: ${pathPart}`,
          });
          continue;
        }
        if (!anchor) continue;
        if (isDirectory) {
          issues.push({
            path: relativeLabel(source, repoRoot),
            line: entry.line,
            reason: `[${label}](${target}) -- anchor given for a directory target`,
          });
          continue;
        }
        if (pathPart && extname(targetPath).toLowerCase() !== '.md') continue;
        const anchors = pathPart
          ? (slugs.get(targetPath) ??
            headingSlugs(readFileSync(targetPath, 'utf8').split(/(?<=\n)/)))
          : headings;
        slugs.set(targetPath, anchors);
        if (!anchors.has(anchor)) {
          const display = pathPart
            ? relativeLabel(targetPath, repoRoot)
            : 'this file';
          issues.push({
            path: relativeLabel(source, repoRoot),
            line: entry.line,
            reason: `[${label}](${target}) -- no heading produces anchor #${anchor} in ${display}`,
          });
        }
      }
    }
    let inFence = false;
    let fence = '';
    for (const [index, line] of lines.entries()) {
      const trimmed = line.trim();
      const match = fencePattern.exec(trimmed);
      if (!match) continue;
      if (!inFence) {
        inFence = true;
        fence = match[1]![0]!.repeat(3);
        const language = trimmed
          .slice(match[1]!.length)
          .trim()
          .split(/\s+/, 1)[0];
        if (language?.toLowerCase() === 'mermaid') {
          issues.push({
            path: relativeLabel(source, repoRoot),
            line: index + 1,
            reason:
              'mermaid block -- draw the diagram as a plain text block or a table instead',
          });
        }
      } else if (trimmed.startsWith(fence)) inFence = false;
    }
  }
  return issues;
}
