import { describe, expect, it } from 'vitest';
import {
  comparisonRowSource,
  currentProfileSource,
  runIdentitySource,
  sourceRunId,
} from '../../src/api/identitySource.ts';
import {
  adHocComparison,
  coreComparison,
  oneTickerComparison,
} from '../fixtures/api/compare.ts';

const runId = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// D289: which identity a ticker shows.
describe('identity source', () => {
  it('names the current profile or the run a ticker belongs to', () => {
    expect(currentProfileSource('ACME')).toEqual({
      kind: 'currentProfile',
      ticker: 'ACME',
    });
    const source = runIdentitySource('ACME', runId(1));
    expect(source).toEqual({
      kind: 'runIdentity',
      ticker: 'ACME',
      runId: runId(1),
    });
    expect(sourceRunId(source)).toBe(runId(1));
    expect(sourceRunId(currentProfileSource('ACME'))).toBeNull();
  });

  it('takes a comparison row from its first saved run in strategy order', () => {
    const acme = coreComparison.rows.find((row) => row.ticker === 'ACME')!;
    expect(comparisonRowSource(acme)).toEqual(
      runIdentitySource('ACME', runId(1)),
    );
  });

  it('skips a missing run to the next strategy that has one', () => {
    // ZED has no momentum run: its first saved run is the graham one.
    const zed = coreComparison.rows.find((row) => row.ticker === 'ZED')!;
    expect(zed.entries[0]?.run).toBeNull();
    expect(comparisonRowSource(zed)).toEqual(
      runIdentitySource('ZED', runId(4)),
    );
  });

  it('falls back to the current profile when the row has no saved run', () => {
    const noRuns = {
      ticker: 'BOLT',
      entries: oneTickerComparison.strategies.map((strategy) => ({
        method_id: strategy.method_id,
        run: null,
      })),
    };
    expect(comparisonRowSource(noRuns)).toEqual(currentProfileSource('BOLT'));
    expect(comparisonRowSource({ ticker: 'BOLT', entries: [] })).toEqual(
      currentProfileSource('BOLT'),
    );
  });

  it('uses the run of an ad hoc comparison row too', () => {
    const acme = adHocComparison.rows[0]!;
    expect(comparisonRowSource(acme)).toEqual(
      runIdentitySource('ACME', runId(21)),
    );
  });
});
