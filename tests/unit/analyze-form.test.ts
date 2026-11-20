// What "Analyze a ticker" adds to the shared form logic (GUI.3d): parameters
// of a refresh of entries (D272), the ticker field's checks (D266) and the
// subject of a one-ticker refresh (D274).
import { describe, expect, it } from 'vitest';
import {
  addEntriesForm,
  asOfTarget,
  entryForm,
  entryTargetOf,
  fieldTarget,
  placeEntryErrors,
  targetOf,
  targetOrder,
  tickersTarget,
} from '../../src/selection/problems.ts';
import {
  readSelectionSchema,
  type SchemaNode,
} from '../../src/selection/schema.ts';
import { singleTickerProblem } from '../../src/selection/tickers.ts';
import * as selection from '../fixtures/api/selection.ts';

const read = (document: { schema: unknown; defaults: unknown }) =>
  readSelectionSchema(
    document.schema as SchemaNode,
    document.defaults as Record<string, unknown>,
  );
const strategy = (document: typeof selection.momentumForm, method: string) => ({
  method,
  fields: read(document).fields,
});
const momentum = strategy(selection.momentumForm, 'sma_crossover');
const quality = strategy(selection.madeUpForm, 'quality_screen');

describe('the parameters of a refresh of entries (D272)', () => {
  it('takes the prefix and the ticker form of the request', () => {
    const form = entryForm(1);
    expect(targetOf('entries[1].selection.short_window', momentum, form)).toBe(
      fieldTarget('sma_crossover', 'short_window'),
    );
    expect(targetOf('entries[1].selection.as_of', momentum, form)).toBe(
      asOfTarget,
    );
    expect(targetOf('entries[0].ticker', momentum, form)).toBe(tickersTarget);
    // Another request's spelling names nothing.
    expect(targetOf('selection.short_window', momentum, form)).toBeNull();
    expect(targetOf('tickers', momentum, form)).toBeNull();
    // The request that adds entries is unchanged.
    expect(targetOf('selection.short_window', momentum, addEntriesForm)).toBe(
      fieldTarget('sma_crossover', 'short_window'),
    );
    expect(targetOf('entries[0].ticker', momentum, addEntriesForm)).toBeNull();
  });

  it('puts entries[i] on the i-th chosen strategy', () => {
    const list = [momentum, quality];
    expect(entryTargetOf('entries[0].ticker', list)).toBe(tickersTarget);
    expect(entryTargetOf('entries[1].ticker', list)).toBe(tickersTarget);
    expect(entryTargetOf('entries[0].selection.short_window', list)).toBe(
      fieldTarget('sma_crossover', 'short_window'),
    );
    expect(entryTargetOf('entries[1].selection.weight', list)).toBe(
      fieldTarget('quality_screen', 'weight'),
    );
    // A field of the other strategy, an entry that is not there, the list
    // itself and anything else name nothing.
    expect(entryTargetOf('entries[1].selection.short_window', list)).toBeNull();
    expect(entryTargetOf('entries[2].selection.weight', list)).toBeNull();
    expect(entryTargetOf('entries', list)).toBeNull();
    expect(entryTargetOf('body', list)).toBeNull();
    expect(entryTargetOf('selection.weight', list)).toBeNull();
  });

  it('places the errors of the failed refresh at their fields, worded with their labels', () => {
    const list = [momentum, quality];
    const placed = placeEntryErrors(
      (selection.failures.entryErrors.body as { errors: never[] }).errors,
      list,
      targetOrder(list),
      (target) =>
        target === tickersTarget ? 'Ticker' : target.split(':').pop(),
      'en',
      'p',
    );
    expect(placed.map((problem) => problem.shownAt)).toEqual([
      tickersTarget,
      fieldTarget('quality_screen', 'weight'),
    ]);
    expect(placed[0]?.text).toBe('Ticker must not be empty.');
    expect(placed[1]?.text).toBe(
      'Invalid weight: Input should be greater than 0',
    );
  });

  it('puts an error that names the list of entries above the button', () => {
    const list = [momentum];
    const [problem] = placeEntryErrors(
      (selection.failures.entriesList.body as { errors: never[] }).errors,
      list,
      targetOrder(list),
      () => undefined,
      'en',
      'p',
    );
    expect(problem).toMatchObject({ shownAt: null, named: [] });
  });
});

describe('the ticker field (D266)', () => {
  it('asks for a ticker when none is typed, white space included', () => {
    expect(singleTickerProblem('')).toBe('none');
    expect(singleTickerProblem('  \t ')).toBe('none');
    expect(singleTickerProblem(' , ')).toBe('none');
  });

  it('refuses more than one ticker, separated by commas or white space', () => {
    expect(singleTickerProblem('ACME, BOLT')).toBe('several');
    expect(singleTickerProblem('ACME BOLT')).toBe('several');
  });

  it('accepts one ticker as typed', () => {
    expect(singleTickerProblem('acme')).toBeNull();
    expect(singleTickerProblem('  BRK.B ')).toBeNull();
  });
});
