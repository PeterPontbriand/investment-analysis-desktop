// The `ian` commands of docs/project/SMOKE_TESTING.md's S4 to S9, in order. A
// unit test fails unless this list equals the command lines in that document.

export type SmokeCommand = { step: string; args: string[] };

export const throwawayFile = 'smoke-test.sqlite3';
export const watchlistName = 'Smoke Test';
export const emptyWatchlistName = 'Smoke Test Empty';

export const setupCommands: SmokeCommand[] = [
  { step: 'S4', args: ['db', 'upgrade'] },
  { step: 'S4', args: ['db', 'status'] },
  { step: 'S5', args: ['watchlist', 'create', watchlistName] },
  { step: 'S5', args: ['watchlist', 'create', emptyWatchlistName] },
  {
    step: 'S6',
    args: ['watchlist', 'add-selection', 'momentum', watchlistName, 'KO'],
  },
  {
    step: 'S6',
    args: [
      'watchlist',
      'add-selection',
      'momentum',
      watchlistName,
      'MSFT',
      '--as-of',
      '2025-12-31',
    ],
  },
  {
    step: 'S6',
    args: [
      'watchlist',
      'add-selection',
      'momentum',
      watchlistName,
      'AAPL',
      '--as-of',
      '2025-12-31T16:00:00-05:00',
    ],
  },
  {
    step: 'S6',
    args: ['watchlist', 'add-selection', 'graham-number', watchlistName, 'KO'],
  },
  { step: 'S7', args: ['refresh', watchlistName] },
  { step: 'S8', args: ['momentum', 'MSFT', '--save-run'] },
  { step: 'S9', args: ['runs', 'list'] },
  { step: 'S9', args: ['runs', 'refreshes'] },
];

// Reads the tool makes beyond the document's commands: machine-readable forms
// used to check state and counts, never to parse text.
export const readCommands = {
  databaseStatus: ['db', 'status', '--json'],
  refreshes: ['runs', 'refreshes', '--json'],
  runs: ['runs', 'list', '--json'],
  watchlists: ['watchlist', 'list', '--json'],
} as const;

// Splits a command line the way the document writes it: words separated by
// spaces, with double quotes around a word that holds spaces.
export function splitCommandLine(line: string): string[] {
  const words: string[] = [];
  const pattern = /"([^"]*)"|(\S+)/g;
  for (const match of line.matchAll(pattern)) words.push(match[1] ?? match[2]!);
  return words;
}
