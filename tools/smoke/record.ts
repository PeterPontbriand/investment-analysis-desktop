// Renders the smoke-test record: Markdown that can be pasted into a pull
// request description.
import type { DocumentStep } from './document.ts';
import {
  describeStart,
  restoreCommandForRecord,
  type EngineState,
  type StartPoint,
} from './checkout.ts';
import { ianSourceNames, type IanSource } from './source.ts';

// A step the tool did. `leftToYou` is a step the tool only started: the
// contributor marks it. `fail` is a step the tool saw fail.
export type ScriptedStep = {
  fact?: string;
  leftToYou?: boolean;
  fail?: string;
};

export type RecordInput = {
  date: string;
  timeZone: string;
  operatingSystem: string;
  applicationCommit: string;
  dirty: boolean;
  // The short commit the engine checkout was at when the application ran.
  engineCommit: string | null;
  // Where `ian` was found: IAD_IAN_PATH, PATH or uv's command folder.
  ianSource: IanSource | null;
  engineVersion: string | null;
  // Changes `ian about` reported in the engine checkout before any switch.
  engineUncommitted: boolean | null;
  // Set when the tool switched the engine checkout.
  engineSwitch: { start: StartPoint; state: EngineState } | null;
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

// What the lines the tool updates in place are made from.
export type LineInput = Pick<
  RecordInput,
  | 'engineCommit'
  | 'ianSource'
  | 'engineVersion'
  | 'engineUncommitted'
  | 'engineSwitch'
  | 'steps'
  | 'scripted'
>;

// A secret never reaches the record, whatever the output held.
export function scrub(
  text: string,
  repositoryRoot: string,
  engineFolder: string | null = null,
): string {
  let result = text;
  for (const [folder, name] of [
    [repositoryRoot, '<repository>'],
    [engineFolder ?? '', '<engine checkout>'],
  ] as const) {
    const variants = new Set([
      folder,
      folder.split('\\').join('/'),
      folder.split('/').join('\\'),
    ]);
    for (const variant of variants)
      if (variant !== '') result = result.split(variant).join(name);
  }
  return result.replace(
    /("?token"?\s*[:=]\s*"?)[A-Za-z0-9_-]{16,}/gi,
    '$1<removed>',
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// The engine line: the commit, the version `ian about` reports, where `ian`
// came from, and what happened to the checkout. It never names the
// installation folder, because the record is pasted into public pull requests.
function engineLine(input: LineInput): string {
  if (input.engineCommit === null) return 'not checked';
  const parts = [
    `${input.engineCommit}, matches vendor/ian/SOURCE.md`,
    `version ${input.engineVersion ?? 'unknown'}, from \`ian about\``,
    `\`ian\` from ${input.ianSource === null ? 'an unknown place' : ianSourceNames[input.ianSource]}`,
  ];
  const engine = input.engineSwitch;
  parts.push(
    engine === null
      ? 'not switched'
      : engine.state === 'restored'
        ? `switched from ${describeStart(engine.start)} and restored`
        : engine.state === 'not-restored'
          ? 'switched and not restored'
          : `switched from ${describeStart(engine.start)}, to be restored when the test ends`,
  );
  if (input.engineUncommitted === true)
    parts.push('the engine checkout has uncommitted changes');
  return parts.join('; ');
}

// The Engine line exactly as the record has it. After the application starts,
// the tool replaces this line in place and touches nothing else.
export function engineRecordLine(input: LineInput): string {
  return `- **Engine:** ${engineLine(input)}`;
}

export function setupStepLine(
  step: DocumentStep,
  done: ScriptedStep | undefined,
): string {
  const fact = done?.fact ? ` (${done.fact})` : '';
  return `- **${step.id}** ${step.hint}:${done ? (done.fail !== undefined ? ` fail (scripted): ${done.fail}` : done.leftToYou ? fact : ` pass (scripted)${fact}`) : ''}`;
}

// The lines of the record that the tool may update in place once it has
// handed the record over.
export type RecordLines = { engine: string; step10: string | null };

export function recordLines(input: LineInput): RecordLines {
  const step = input.steps.find((entry) => entry.id === 'Step 10');
  return {
    engine: engineRecordLine(input),
    step10:
      step === undefined
        ? null
        : setupStepLine(step, input.scripted.get(step.id)),
  };
}

// Replaces the one line that is exactly `from` with `to`, and returns the
// whole file with every other byte unchanged, line endings included. Returns
// null, changing nothing, when `from` is not exactly one whole line.
export function replaceRecordLine(
  content: Uint8Array,
  from: string,
  to: string,
): Uint8Array | null {
  // Latin-1 maps each byte to one character, so the bytes round-trip exactly.
  const bytes = (text: string) => Buffer.from(text, 'utf8').toString('latin1');
  const parts = Buffer.from(content)
    .toString('latin1')
    .split(/(\r\n|\n)/);
  const wanted = bytes(from);
  const found: number[] = [];
  for (let index = 0; index < parts.length; index += 2)
    if (parts[index] === wanted) found.push(index);
  if (found.length !== 1) return null;
  parts[found[0]!] = bytes(to);
  return Buffer.from(parts.join(''), 'latin1');
}

export function renderRecord(input: RecordInput): string {
  const lines: string[] = ['# Smoke test record', ''];
  lines.push(`- **Date:** ${input.date}`);
  lines.push(`- **Time zone:** ${input.timeZone}`);
  lines.push(`- **Operating system:** ${input.operatingSystem}`);
  lines.push(
    `- **Application commit:** ${input.applicationCommit}${input.dirty ? ' (with uncommitted changes)' : ''}`,
  );
  lines.push(engineRecordLine(input));
  if (input.engineSwitch !== null)
    lines.push(
      `- **Restore command:** \`${restoreCommandForRecord(input.engineSwitch.start)}\``,
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
  for (const step of input.steps.filter((entry) =>
    entry.id.startsWith('Step '),
  )) {
    lines.push(setupStepLine(step, input.scripted.get(step.id)));
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
  for (const step of input.steps.filter(
    (entry) => !entry.id.startsWith('Step '),
  ))
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
