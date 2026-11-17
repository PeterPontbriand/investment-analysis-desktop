// What the remove dialog offers for one entry (D219), counted from the entries
// as last shown. A count is null when the option is not offered, because the
// entry is the only one for its ticker or for its strategy.
export type RemovableEntry = {
  index: number;
  ticker: string;
  selection: { method_id: string };
};

export type RemoveOptions = {
  ticker: number | null;
  method: number | null;
};

export function removeOptions(
  entries: RemovableEntry[],
  entry: RemovableEntry,
): RemoveOptions {
  const sameTicker = entries.filter((e) => e.ticker === entry.ticker).length;
  const sameMethod = entries.filter(
    (e) => e.selection.method_id === entry.selection.method_id,
  ).length;
  return {
    ticker: sameTicker > 1 ? sameTicker : null,
    method: sameMethod > 1 ? sameMethod : null,
  };
}

export type RemoveChoice = 'entry' | 'ticker' | 'method';
