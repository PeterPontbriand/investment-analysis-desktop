import { describe, expect, it } from 'vitest';
import {
  outcomeTones,
  toneOf,
  type RunOutcome,
} from '../../src/components/outcomeTone.ts';

// Typed by the vendored enum: a value added to RunOutcome in src/api/schema.ts
// fails the type check here until it is listed.
const everyOutcome: Record<RunOutcome, true> = {
  completed: true,
  unavailable: true,
  not_applicable: true,
  failed: true,
};

describe('outcome tones', () => {
  it('has an explicit entry for every RunOutcome value', () => {
    expect(Object.keys(outcomeTones).sort()).toEqual(
      Object.keys(everyOutcome).sort(),
    );
  });

  it('maps each code to its tone', () => {
    expect(toneOf('completed')).toBe('positive');
    expect(toneOf('unavailable')).toBe('caution');
    expect(toneOf('failed')).toBe('negative');
    expect(toneOf('not_applicable')).toBe('neutral');
  });

  it('shows an unknown code, including an object property name, as neutral', () => {
    expect(toneOf('something_new')).toBe('neutral');
    expect(toneOf('toString')).toBe('neutral');
  });
});
