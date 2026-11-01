import { readFileSync } from 'node:fs';
import { listMarkdownFiles } from './markdown-files.ts';

const statuses = ['Complete', 'In progress', 'Next', 'Planned', 'Deferred'];
const statusOrder = new Map(statuses.map((status, index) => [status, index]));
const fencePattern = /^(```+|~~~+)/;
export type SequenceIssue = { path: string; line: number; reason: string };

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparator(row: string[]): boolean {
  return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function checkFile(path: string): SequenceIssue[] {
  const lines = readFileSync(path, 'utf8').split(/(?<=\n)/);
  const issues: SequenceIssue[] = [];
  let index = 0;
  let fence = '';
  while (index < lines.length) {
    const text = lines[index]!.replace(/\r?\n$/, '');
    const match = fencePattern.exec(text.trim());
    if (match) {
      if (!fence) fence = match[1]![0]!.repeat(3);
      else if (text.trim().startsWith(fence)) fence = '';
      index += 1;
      continue;
    }
    if (fence) {
      index += 1;
      continue;
    }
    const header = cells(text);
    if (
      header.length < 2 ||
      header.slice(-2).join('|') !== 'Status|Completed' ||
      index + 1 >= lines.length
    ) {
      index += 1;
      continue;
    }
    const separator = cells(lines[index + 1]!.replace(/\r?\n$/, ''));
    if (separator.length !== header.length || !isSeparator(separator)) {
      index += 1;
      continue;
    }

    let previousStatus = -1;
    let previousDate: string | null = null;
    let nextCount = 0;
    let secondNextLine = index + 3;
    let rowIndex = index + 2;
    while (rowIndex < lines.length) {
      const rowLine = lines[rowIndex]!.replace(/\r?\n$/, '');
      if (!rowLine.trim().startsWith('|')) break;
      const row = cells(rowLine);
      if (row.length !== header.length) break;
      const lineNumber = rowIndex + 1;
      const [status, completed] = row.slice(-2) as [string, string];
      const order = statusOrder.get(status);
      if (order === undefined) {
        issues.push({
          path,
          line: lineNumber,
          reason: `unknown status ${JSON.stringify(status)}; allowed statuses: ${statuses.join(', ')}`,
        });
      } else {
        if (order < previousStatus)
          issues.push({
            path,
            line: lineNumber,
            reason: `status ${JSON.stringify(status)} is out of order`,
          });
        previousStatus = order;
      }
      if (status === 'Complete') {
        const parsed =
          /^\d{4}-\d{2}-\d{2}$/.test(completed) &&
          completed.slice(0, 4) !== '0000'
            ? new Date(`${completed}T00:00:00.000Z`)
            : null;
        if (
          !parsed ||
          Number.isNaN(parsed.valueOf()) ||
          parsed.toISOString().slice(0, 10) !== completed
        ) {
          issues.push({
            path,
            line: lineNumber,
            reason: 'Complete row must have an ISO date in Completed',
          });
        } else {
          if (previousDate && completed < previousDate)
            issues.push({
              path,
              line: lineNumber,
              reason: 'Complete dates must be in non-decreasing order',
            });
          previousDate = completed;
        }
      } else if (completed) {
        issues.push({
          path,
          line: lineNumber,
          reason: `${status} row must leave Completed empty`,
        });
      }
      if (status === 'Next') {
        nextCount += 1;
        if (nextCount === 2) secondNextLine = lineNumber;
      }
      rowIndex += 1;
    }
    if (nextCount > 1)
      issues.push({
        path,
        line: secondNextLine,
        reason: 'sequence table has more than one Next row',
      });
    index = Math.max(rowIndex, index + 2);
  }
  return issues;
}

export function checkSequenceTables(repoRoot: string): SequenceIssue[] {
  return listMarkdownFiles(repoRoot).flatMap((file) => checkFile(file));
}
