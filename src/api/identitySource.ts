import type { components } from './schema.ts';

// Where the details of a ticker come from (D289). A run keeps the identity its
// company had when it ran, and a ticker can name another company later, so a
// ticker tied to a saved run shows that run's identity, never the ticker's
// current profile.
export type IdentitySource =
  | { kind: 'currentProfile'; ticker: string }
  | { kind: 'runIdentity'; ticker: string; runId: string };

export const currentProfileSource = (ticker: string): IdentitySource => ({
  kind: 'currentProfile',
  ticker,
});

export const runIdentitySource = (
  ticker: string,
  runId: string,
): IdentitySource => ({ kind: 'runIdentity', ticker, runId });

type ComparisonRow =
  components['schemas']['RunsCompareDocument']['rows'][number];

// A comparison row's source: its first saved run in the comparison's strategy
// order, which is the order of the row's entries, and the current profile when
// the row has no saved run.
export function comparisonRowSource(row: ComparisonRow): IdentitySource {
  const first = row.entries.find((entry) => entry.run !== null)?.run;
  return first === null || first === undefined
    ? currentProfileSource(row.ticker)
    : runIdentitySource(row.ticker, first.analysis_run_id);
}

// The run a source names, when it names one.
export const sourceRunId = (source: IdentitySource): string | null =>
  source.kind === 'runIdentity' ? source.runId : null;
