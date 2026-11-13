// Reads the steps and the setup commands from docs/project/SMOKE_TESTING.md,
// so a step change in the document needs no change in the tool.
import { splitCommandLine } from './commands.ts';

export type DocumentStep = {
  id: string;
  // The step's first sentence, with links replaced by their text.
  hint: string;
};

const stepStart = /^([SNWRHEL]\d+)\. (.*)$/;

function firstSentence(text: string): string {
  const plain = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const end = /\.(?=\s|$)/.exec(plain);
  const sentence = end ? plain.slice(0, end.index + 1) : plain;
  return sentence.replace(/[.:]$/, '').trim();
}

// A step is a paragraph that starts with its id and a full stop at the start of
// a line, outside fenced blocks.
export function parseSteps(markdown: string): DocumentStep[] {
  const steps: DocumentStep[] = [];
  let fenced = false;
  let current: { id: string; lines: string[] } | null = null;
  const finish = () => {
    if (current)
      steps.push({
        id: current.id,
        hint: firstSentence(current.lines.join(' ')),
      });
    current = null;
  };
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      finish();
      continue;
    }
    if (fenced) continue;
    const start = stepStart.exec(line);
    if (start) {
      finish();
      current = { id: start[1]!, lines: [start[2]!] };
    } else if (line.trim() === '') {
      finish();
    } else if (current) {
      current.lines.push(line.trim());
    }
  }
  finish();
  return steps;
}

// The `ian` command lines in the fenced blocks from S4 up to S10, in order,
// each as its arguments after `ian`.
export function parseSetupCommands(markdown: string): string[][] {
  const lines = markdown.split(/\r?\n/);
  const from = lines.findIndex((line) => line.startsWith('S4. '));
  const to = lines.findIndex((line) => line.startsWith('S10. '));
  if (from < 0 || to < 0 || to < from)
    throw new Error('SMOKE_TESTING.md has no S4 to S10 range.');
  const commands: string[][] = [];
  let fenced = false;
  for (const line of lines.slice(from, to)) {
    if (/^```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced && line.startsWith('ian ')) {
      commands.push(splitCommandLine(line).slice(1));
    }
  }
  return commands;
}
