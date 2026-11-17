import { describe, expect, it } from 'vitest';
import { removeOptions } from '../../src/views/removeOptions.ts';

const entry = (index: number, ticker: string, method: string) => ({
  index,
  ticker,
  selection: { method_id: method },
});

const entries = [
  entry(1, 'ACME', 'momentum'),
  entry(2, 'ACME', 'graham'),
  entry(3, 'BOLT', 'momentum'),
  entry(4, 'CORE', 'piotroski'),
];

describe('remove options', () => {
  it('counts the other entries of the ticker and of the strategy', () => {
    expect(removeOptions(entries, entries[0]!)).toEqual({
      ticker: 2,
      method: 2,
    });
  });

  it('offers only what has another entry', () => {
    expect(removeOptions(entries, entries[1]!)).toEqual({
      ticker: 2,
      method: null,
    });
    expect(removeOptions(entries, entries[2]!)).toEqual({
      ticker: null,
      method: 2,
    });
  });

  it('offers nothing but the entry when it is alone', () => {
    expect(removeOptions(entries, entries[3]!)).toEqual({
      ticker: null,
      method: null,
    });
  });
});
