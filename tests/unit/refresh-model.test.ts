import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnnouncer } from '../../src/composables/announcer.ts';
import {
  endOf,
  pillsOf,
  sharedTicker,
  subjectOf,
  subjectText,
} from '../../src/views/refreshModel.ts';
import { recordAfter } from '../../src/api/refreshes.ts';
import { job, started, summary, totals } from '../fixtures/api/refresh.ts';
import { outcomeTones } from '../../src/components/outcomeTone.ts';
import { references } from '../fixtures/api/data.ts';
import openapi from '../../vendor/ian/openapi.json' with { type: 'json' };

const order = Object.keys(references.code_sets.RunOutcome ?? {});

describe('counts pills (D248)', () => {
  it('shows the outcomes with a nonzero count in the served order, then the unexpected problems', () => {
    expect(
      pillsOf(
        {
          not_applicable: 0,
          failed: 1,
          completed: 9,
          unavailable: 1,
          error: 2,
        },
        order,
      ),
    ).toEqual({
      outcomes: [
        { code: 'completed', count: 9 },
        { code: 'unavailable', count: 1 },
        { code: 'failed', count: 1 },
      ],
      unexpected: 2,
    });
  });

  it('has no unexpected pill without that count', () => {
    expect(pillsOf({ completed: 1 }, order).unexpected).toBe(0);
    expect(pillsOf({ completed: 1, error: 0 }, order).unexpected).toBe(0);
  });

  it('knows every key the vendored description can put in the counts', () => {
    const schemas = openapi.components.schemas as unknown as Record<
      string,
      { properties: Record<string, { description: string }> }
    >;
    const description = schemas.RefreshSummaryDocument!.properties;
    // The summary names the outcomes and the one extra key `error`; the
    // outcome list is the vendored enum, which the tone table is typed from.
    expect(description.counts!.description).toContain('`error`');
    expect(Object.keys(outcomeTones).sort()).toEqual(
      (
        openapi.components.schemas as unknown as {
          RunOutcome: { enum: string[] };
        }
      ).RunOutcome.enum.sort(),
    );
  });
});

describe('who a refresh is of (D250)', () => {
  it('names the watchlist from the lookup while it runs and from the summary after', () => {
    const running = recordAfter(null, job());
    expect(subjectOf({ ...running, lookedUpName: 'Core' })).toEqual({
      kind: 'name',
      name: 'Core',
    });
    const ended = recordAfter(
      null,
      job({
        state: 'completed',
        summary: summary({}, { watchlist_name: 'Core at the time' }),
      }),
    );
    expect(subjectOf({ ...ended, lookedUpName: null })).toEqual({
      kind: 'name',
      name: 'Core at the time',
    });
  });

  it('says "a watchlist" when the lookup cannot find it, and ad hoc for entries', () => {
    const record = recordAfter(null, job());
    expect(subjectOf({ ...record, lookedUpName: null })).toEqual({
      kind: 'unknown',
    });
    expect(subjectOf(recordAfter(null, job({ watchlist_id: null })))).toEqual({
      kind: 'adHoc',
    });
  });

  it('names how each ended state ended', () => {
    const of = (state: string) => endOf(recordAfter(null, job({ state })));
    expect(of('completed')).toBe('finished');
    expect(of('stopped')).toBe('stopped');
    expect(of('failed')).toBe('failed');
    expect(of('running')).toBeNull();
    expect(of('stopping')).toBeNull();
    expect(
      recordAfter(null, job({ totals: totals(2, 1, 1) })).totals.finished,
    ).toBe(1);
  });
});

describe('announcing progress (D253)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not announce the first count, announces a change, and at most once in ten seconds', async () => {
    const said: string[] = [];
    const announcer = createAnnouncer((text) => said.push(text));
    announcer.update(0, '0 of 4');
    expect(said).toEqual([]);
    announcer.update(1, '1 of 4');
    expect(said).toEqual(['1 of 4']);
    await vi.advanceTimersByTimeAsync(2000);
    announcer.update(2, '2 of 4');
    await vi.advanceTimersByTimeAsync(2000);
    announcer.update(3, '3 of 4');
    // Held back until ten seconds after the last announcement, then the latest.
    expect(said).toEqual(['1 of 4']);
    await vi.advanceTimersByTimeAsync(5999);
    expect(said).toEqual(['1 of 4']);
    await vi.advanceTimersByTimeAsync(1);
    expect(said).toEqual(['1 of 4', '3 of 4']);
  });

  it('says nothing when the count has not changed', async () => {
    const said: string[] = [];
    const announcer = createAnnouncer((text) => said.push(text));
    announcer.update(2, '2 of 4');
    announcer.update(2, '2 of 4');
    await vi.advanceTimersByTimeAsync(30_000);
    announcer.update(2, '2 of 4');
    expect(said).toEqual([]);
  });

  it('always announces the end, at once', async () => {
    const said: string[] = [];
    const announcer = createAnnouncer((text) => said.push(text));
    announcer.update(0, '0 of 2');
    announcer.update(1, '1 of 2');
    announcer.update(2, '2 of 2');
    announcer.end('Finished');
    expect(said).toEqual(['1 of 2', 'Finished']);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(said).toEqual(['1 of 2', 'Finished']);
  });
});

describe('the ticker of an ad hoc refresh (D274)', () => {
  const adHoc = (fields: Parameters<typeof job>[0] = {}) =>
    job({ watchlist_id: null, ...fields });
  const rowsOf = (tickers: string[]) =>
    tickers.map((ticker, index) =>
      started(index + 1, index, ticker, 'sma_crossover'),
    );

  it('is the ticker the application sent, when it started the refresh', () => {
    const record = recordAfter(null, adHoc({ totals: totals(2, 0, 0) }), [
      'ACME',
    ]);
    expect(subjectOf(record)).toEqual({ kind: 'ticker', ticker: 'ACME' });
    // It stays known as the polls bring rows in, and across a later document.
    const next = recordAfter(
      record,
      adHoc({
        totals: totals(2, 1, 0),
        events: rowsOf(['ACME']),
        next_after: 1,
      }),
    );
    expect(subjectOf(next)).toEqual({ kind: 'ticker', ticker: 'ACME' });
  });

  it('is spelled as the engine spells it once a row has it', () => {
    const record = recordAfter(
      null,
      adHoc({
        totals: totals(2, 1, 0),
        events: rowsOf(['ACME']),
        next_after: 1,
      }),
      ['acme'],
    );
    expect(subjectOf(record)).toEqual({ kind: 'ticker', ticker: 'ACME' });
    expect(
      subjectOf(
        recordAfter(null, adHoc({ totals: totals(2, 0, 0) }), ['acme']),
      ),
    ).toEqual({ kind: 'ticker', ticker: 'acme' });
  });

  it('is the ticker of the rows once every entry has a row', () => {
    const record = recordAfter(
      null,
      adHoc({
        totals: totals(2, 2, 0),
        events: rowsOf(['ACME', 'ACME']),
        next_after: 2,
      }),
    );
    expect(subjectOf(record)).toEqual({ kind: 'ticker', ticker: 'ACME' });
  });

  it('stays "ad hoc entries" for a refresh attached to part-way', () => {
    const record = recordAfter(
      null,
      adHoc({
        totals: totals(2, 1, 0),
        events: rowsOf(['ACME']),
        next_after: 1,
      }),
    );
    expect(subjectOf(record)).toEqual({ kind: 'adHoc' });
    // And before any row, or with nothing to refresh.
    expect(
      subjectOf(recordAfter(null, adHoc({ totals: totals(2, 0, 0) }))),
    ).toEqual({ kind: 'adHoc' });
    expect(
      subjectOf(recordAfter(null, adHoc({ totals: totals(0, 0, 0) }))),
    ).toEqual({ kind: 'adHoc' });
  });

  it('stays "ad hoc entries" for more than one ticker', () => {
    const mixed = recordAfter(
      null,
      adHoc({
        totals: totals(2, 2, 0),
        events: rowsOf(['ACME', 'BOLT']),
        next_after: 2,
      }),
    );
    expect(subjectOf(mixed)).toEqual({ kind: 'adHoc' });
    expect(
      subjectOf(
        recordAfter(null, adHoc({ totals: totals(2, 0, 0) }), ['ACME', 'BOLT']),
      ),
    ).toEqual({ kind: 'adHoc' });
  });

  it('never names a ticker for a watchlist refresh', () => {
    expect(
      subjectOf({
        ...recordAfter(
          null,
          job({ totals: totals(1, 1, 0), events: rowsOf(['ACME']) }),
        ),
        lookedUpName: 'Core',
      }),
    ).toEqual({ kind: 'name', name: 'Core' });
  });

  it('words the subject as a heading or an announcement does', () => {
    const t = (key: string) => key;
    expect(subjectText({ kind: 'ticker', ticker: 'ACME' }, t)).toBe('ACME');
    expect(subjectText({ kind: 'name', name: 'Core' }, t)).toBe('Core');
    expect(subjectText({ kind: 'adHoc' }, t)).toBe('refresh.subject.adHoc');
  });

  it('finds the one ticker the rows of a comparison share', () => {
    expect(sharedTicker(['ACME'])).toBe('ACME');
    expect(sharedTicker(['ACME', 'ACME'])).toBe('ACME');
    expect(sharedTicker(['ACME', 'BOLT'])).toBeNull();
    expect(sharedTicker([])).toBeNull();
  });
});
