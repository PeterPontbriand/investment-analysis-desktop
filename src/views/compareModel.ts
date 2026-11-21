import type { components } from '../api/schema.ts';

type Schemas = components['schemas'];
export type CompareDocument = Schemas['RunsCompareDocument'];
export type CompareRun = Schemas['CompareRunDocument'];
export type CompareRow = CompareDocument['rows'][number];
export type CompareCell = Schemas['CompareCellDocument'];

// A column the cells of a strategy group share.
export type GroupColumn = { key: string; label: string; term: string };

// One strategy's group of columns (D160). The columns are the cells the group's
// runs carry, in order of first appearance; the group shows an outcome column
// only when one of its runs did not complete (D91).
export type Group = {
  index: number;
  methodId: string;
  columns: GroupColumn[];
  outcomeColumn: boolean;
  // The columns the group's value cells take (at least one, so a group whose
  // runs have no cells still has a place for its message).
  valueSpan: number;
  // All the columns the group takes, the outcome column included.
  span: number;
};

export function groupsOf(document: CompareDocument): Group[] {
  return document.strategies.map((strategy, index) => {
    const runs = document.rows.map((row) => row.entries[index]?.run ?? null);
    const seen = new Map<string, GroupColumn>();
    for (const run of runs)
      for (const cell of run?.headline?.cells ?? [])
        if (!seen.has(cell.key))
          seen.set(cell.key, {
            key: cell.key,
            label: cell.label,
            term: cell.term,
          });
    const outcomeColumn = runs.some(
      (run) => run !== null && run.outcome !== 'completed',
    );
    const valueSpan = Math.max(1, seen.size);
    return {
      index,
      methodId: strategy.method_id,
      columns: [...seen.values()],
      outcomeColumn,
      valueSpan,
      span: valueSpan + (outcomeColumn ? 1 : 0),
    };
  });
}

// The cell of a run under a column, when the run has one.
export function cellOf(run: CompareRun, key: string): CompareCell | undefined {
  return run.headline?.cells.find((cell) => cell.key === key);
}

// The outcomes with a nonzero count, in the order given (the engine's order
// of its outcome codes). Every count is the document's own.
export function outcomeCountsOf(
  document: CompareDocument,
  order: string[],
): { code: string; count: number }[] {
  const counts = document.outcome_counts as Record<string, number>;
  return order
    .filter((code) => (counts[code] ?? 0) > 0)
    .map((code) => ({ code, count: counts[code] ?? 0 }));
}
