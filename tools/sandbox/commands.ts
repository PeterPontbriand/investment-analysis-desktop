// The `ian` commands that make the sandbox's sample data, in order.

export type SandboxCommand = { step: string; args: string[] };

export const throwawayFile = 'sandbox.sqlite3';
export const watchlistName = 'Sandbox';
export const emptyWatchlistName = 'Sandbox Empty';
export const scratchWatchlistName = 'Sandbox Scratch';

export const setupCommands: SandboxCommand[] = [
  { step: 'Database', args: ['db', 'upgrade'] },
  { step: 'Database', args: ['db', 'status'] },
  { step: 'Watchlists', args: ['watchlist', 'create', watchlistName] },
  { step: 'Watchlists', args: ['watchlist', 'create', emptyWatchlistName] },
  { step: 'Watchlists', args: ['watchlist', 'create', scratchWatchlistName] },
  {
    step: 'Entries',
    args: ['watchlist', 'add-selection', 'momentum', watchlistName, 'KO'],
  },
  {
    step: 'Entries',
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
    step: 'Entries',
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
    step: 'Entries',
    args: ['watchlist', 'add-selection', 'graham-number', watchlistName, 'KO'],
  },
  {
    step: 'Entries',
    args: ['watchlist', 'add-selection', 'piotroski', watchlistName, 'SPY'],
  },
  {
    step: 'Entries',
    args: [
      'watchlist',
      'add-selection',
      'momentum',
      scratchWatchlistName,
      'KO',
    ],
  },
  {
    step: 'Entries',
    args: [
      'watchlist',
      'add-selection',
      'momentum',
      scratchWatchlistName,
      'MSFT',
    ],
  },
  {
    step: 'Entries',
    args: [
      'watchlist',
      'add-selection',
      'momentum',
      scratchWatchlistName,
      'AAPL',
    ],
  },
  {
    step: 'Entries',
    args: [
      'watchlist',
      'add-selection',
      'graham-number',
      scratchWatchlistName,
      'KO',
    ],
  },
  {
    step: 'Entries',
    args: [
      'watchlist',
      'add-selection',
      'graham-number',
      scratchWatchlistName,
      'MSFT',
    ],
  },
  {
    step: 'Entries',
    args: [
      'watchlist',
      'add-selection',
      'graham-number',
      scratchWatchlistName,
      'AAPL',
    ],
  },
  { step: 'Refresh', args: ['refresh', watchlistName] },
  { step: 'Analysis', args: ['momentum', 'MSFT', '--save-run'] },
  { step: 'Counts', args: ['runs', 'list'] },
  { step: 'Counts', args: ['runs', 'refreshes'] },
];

// Reads the tool makes beyond the document's commands: machine-readable forms
// used to check state and counts, never to parse text.
export const readCommands = {
  refreshes: ['runs', 'refreshes', '--json'],
  runs: ['runs', 'list', '--json'],
  watchlists: ['watchlist', 'list', '--json'],
} as const;
