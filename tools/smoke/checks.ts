// The `--checks` option of `pnpm smoke`: which checks of
// docs/project/SMOKE_TESTING.md a targeted run names.

export type Targeted = {
  // The named check ids, in the order given.
  ids: string[];
  // The selection in plain English, ranges as given: "Checks C1 to C6, H1 and H8".
  label: string;
};

export type ChecksResult =
  { ok: true; targeted: Targeted } | { ok: false; message: string };

const idPattern = /^([A-Z])(\d+)$/;

function split(id: string): { letter: string; number: number } | null {
  const match = idPattern.exec(id);
  return match ? { letter: match[1]!, number: Number(match[2]) } : null;
}

// The valid ids with each letter group compressed into runs: "C1 to C6".
export function describeValid(valid: string[]): string {
  const groups = new Map<string, number[]>();
  for (const id of valid) {
    const part = split(id);
    if (part)
      groups.set(part.letter, [
        ...(groups.get(part.letter) ?? []),
        part.number,
      ]);
  }
  const parts: string[] = [];
  for (const [letter, numbers] of groups) {
    const sorted = [...numbers].sort((a, b) => a - b);
    let start = sorted[0]!;
    let previous = start;
    const flush = () =>
      parts.push(
        start === previous
          ? `${letter}${start}`
          : `${letter}${start} to ${letter}${previous}`,
      );
    for (const number of sorted.slice(1)) {
      if (number !== previous + 1) {
        flush();
        start = number;
      }
      previous = number;
    }
    flush();
  }
  return parts.join(', ');
}

function joinPlain(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

export function parseChecks(list: string, valid: string[]): ChecksResult {
  const refuse = (reason: string): ChecksResult => ({
    ok: false,
    message: `\`--checks\` cannot use "${list}": ${reason}. The checks in docs/project/SMOKE_TESTING.md are ${describeValid(valid)}. Give check ids and ranges within one letter group, for example \`--checks C1-C6,H1\`.`,
  });
  // Commas, whitespace or a mix separate the items: PowerShell passes an
  // unquoted comma list on as words, and repeated separators leave empty items.
  const tokens = list.split(/[\s,]+/).filter((token) => token !== '');
  if (tokens.length === 0) return refuse('the list is empty');
  const ids: string[] = [];
  const phrases: string[] = [];
  for (const token of tokens) {
    const [from, to, ...extra] = token.split('-');
    if (from === undefined || from === '' || extra.length > 0)
      return refuse(`"${token}" is not a check id or a range`);
    const start = split(from);
    if (!start) return refuse(`"${from}" is not a check id`);
    if (to === undefined) {
      if (!valid.includes(from)) return refuse(`"${from}" is not a check`);
      ids.push(from);
      phrases.push(from);
      continue;
    }
    const end = split(to);
    if (!end) return refuse(`"${to}" is not a check id`);
    if (start.letter !== end.letter)
      return refuse(`the range "${token}" crosses two letter groups`);
    if (start.number > end.number)
      return refuse(`the range "${token}" is reversed`);
    for (let n = start.number; n <= end.number; n += 1) {
      const id = `${start.letter}${n}`;
      if (!valid.includes(id)) return refuse(`"${id}" is not a check`);
      ids.push(id);
    }
    phrases.push(`${from} to ${to}`);
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return refuse(`${id} is named twice`);
    seen.add(id);
  }
  const noun = ids.length === 1 ? 'Check' : 'Checks';
  return {
    ok: true,
    targeted: { ids, label: `${noun} ${joinPlain(phrases)}` },
  };
}

// The list given to `--checks`, from the arguments; null when the option is
// absent (undefined). The option is accepted once, as `--checks list` or `--checks=list`.
export function checksArgument(args: string[]): string | undefined {
  if (args.length === 1 && args[0]!.startsWith('--checks='))
    return args[0]!.slice('--checks='.length);
  if (args.length === 2 && args[0] === '--checks') return args[1]!;
  if (args.length === 1 && args[0] === '--checks') return '';
  return undefined;
}
