import type { components } from '../api/schema.ts';

export type RunOutcome = components['schemas']['RunOutcome'];
export type Tone = 'positive' | 'caution' | 'negative' | 'neutral';

// The tone of each outcome code. The record is typed by the vendored enum, so
// a new engine outcome fails the type check until it gets an entry here.
export const outcomeTones: Record<RunOutcome, Tone> = {
  completed: 'positive',
  unavailable: 'caution',
  failed: 'negative',
  not_applicable: 'neutral',
};

// A code this application does not know is neutral.
export function toneOf(code: string): Tone {
  return Object.hasOwn(outcomeTones, code)
    ? outcomeTones[code as RunOutcome]
    : 'neutral';
}
