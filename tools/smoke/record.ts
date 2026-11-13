// Renders the smoke-test record: Markdown that can be pasted into a pull
// request description.
import type { DocumentStep } from './document.ts';

// A step the tool did. `leftToYou` is a step the tool only started: the
// contributor marks it.
export type ScriptedStep = { fact?: string; leftToYou?: boolean };

export type RecordInput = {
  date: string;
  timeZone: string;
  operatingSystem: string;
  applicationCommit: string;
  dirty: boolean;
  engineCommit: string | null;
  enginePath: string | null;
  engineVersion: string | null;
  data: {
    watchlists: number;
    entries: number;
    runs: number;
    refreshes: number;
  } | null;
  throwawayFolder: string | null;
  steps: DocumentStep[];
  // The steps the tool did, by id.
  scripted: Map<string, ScriptedStep>;
  // Each command as run, with its output.
  log: { command: string; output: string }[];
  // Set when the tool stopped before the end.
  stopped: { step: string; message: string } | null;
};

// A secret never reaches the record, whatever the output held.
export function scrub(text: string, repositoryRoot: string): string {
  const variants = new Set([
    repositoryRoot,
    repositoryRoot.split('\\').join('/'),
    repositoryRoot.split('/').join('\\'),
  ]);
  let result = text;
  for (const variant of variants)
    if (variant !== '') result = result.split(variant).join('<repository>');
  return result.replace(
    /("?token"?\s*[:=]\s*"?)[A-Za-z0-9_-]{16,}/gi,
    '$1<removed>',
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function renderRecord(input: RecordInput): string {
  const lines: string[] = ['# Smoke test record', ''];
  lines.push(`- **Date:** ${input.date}`);
  lines.push(`- **Time zone:** ${input.timeZone}`);
  lines.push(`- **Operating system:** ${input.operatingSystem}`);
  lines.push(
    `- **Application commit:** ${input.applicationCommit}${input.dirty ? ' (with uncommitted changes)' : ''}`,
  );
  lines.push(
    `- **Engine commit:** ${input.engineCommit === null ? 'not checked' : `${input.engineCommit}, matches vendor/ian/SOURCE.md`}`,
  );
  lines.push(
    `- **Engine:** ${
      input.enginePath === null
        ? 'not found'
        : `\`ian\` from ${input.enginePath}; version ${input.engineVersion ?? 'unknown'}, from the engine checkout's pyproject.toml`
    }`,
  );
  lines.push(
    `- **Data:** ${
      input.data === null
        ? 'not created'
        : `${plural(input.data.watchlists, 'watchlist', 'watchlists')}, ${plural(input.data.entries, 'entry', 'entries')}, ${plural(input.data.runs, 'run', 'runs')}, ${plural(input.data.refreshes, 'refresh', 'refreshes')}`
    }`,
  );
  lines.push(
    `- **Throwaway folder:** ${input.throwawayFolder ?? 'not created'}`,
  );
  lines.push(
    '',
    'Mark each step `pass`, `fail`, `n/a` or `note`, with a few words for anything that is not a plain pass. A failure note never includes private data.',
    '',
    '## Setup (scripted)',
    '',
  );
  for (const step of input.steps.filter((entry) => entry.id.startsWith('S'))) {
    const done = input.scripted.get(step.id);
    const fact = done?.fact ? ` (${done.fact})` : '';
    lines.push(
      `- **${step.id}** ${step.hint}:${done ? (done.leftToYou ? fact : ` pass (scripted)${fact}`) : ''}`,
    );
  }
  lines.push(
    '',
    '<details><summary>Command output</summary>',
    '',
    '````text',
    ...input.log.flatMap((entry) => [
      `> ${entry.command}`,
      entry.output.trimEnd(),
    ]),
    '````',
    '',
    '</details>',
    '',
    '## Checks',
    '',
  );
  for (const step of input.steps.filter((entry) => !entry.id.startsWith('S')))
    lines.push(`- **${step.id}** ${step.hint}:`);
  lines.push(
    '',
    input.stopped
      ? `**Result:** stopped at ${input.stopped.step}: ${input.stopped.message}`
      : '**Result:** all steps passed | failing step numbers, with notes',
    '',
  );
  return lines.join('\n');
}
