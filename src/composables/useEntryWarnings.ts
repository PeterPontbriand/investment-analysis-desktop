import { shallowRef } from 'vue';
import type { components } from '../api/schema.ts';

// A ticker the engine added to a watchlist but could not confirm, as one line
// shows it: the ticker and the warning code (D282).
export type EntryWarningLine = {
  ticker: string;
  code: components['schemas']['EntryWarningCode'];
};

// The lines of the warnings an add answered with, after the ones already held:
// a ticker warned under several strategies shows once for each code.
export function withWarnings(
  held: EntryWarningLine[],
  warnings: components['schemas']['EntryWarningDocument'][],
): EntryWarningLine[] {
  const lines = [...held];
  for (const { ticker, code } of warnings) {
    if (!lines.some((line) => line.ticker === ticker && line.code === code))
      lines.push({ ticker, code });
  }
  return lines;
}

const pending = shallowRef<EntryWarningLine[]>([]);

// Leaves the warnings for the screen the user ends on, as a notice does; that
// screen takes them once, when it opens.
export function leaveEntryWarnings(lines: EntryWarningLine[]): void {
  pending.value = lines;
}

export function takeEntryWarnings(): EntryWarningLine[] {
  const lines = pending.value;
  pending.value = [];
  return lines;
}
